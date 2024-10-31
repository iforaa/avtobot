import { Composer, Markup, Scenes, Telegraf } from "telegraf";
import { Command } from "./command.class";
import { IBotContext } from "../context/context.interface";
import { cleanUrl } from "../utils/cleanurl";
import { BotService } from "../services/botservice";
import { WizardContext } from "telegraf/typings/scenes";
import { MediaGroup } from "telegraf/typings/telegram-types";
import { constructLinkForVehicle } from "../utils/parseUrlDetails";
import { dateFormatter } from "../utils/dateFormatter";
import { ALL_CARS_MENU, ADD_CAR_MENU } from "./start.command";
let CLOSE_MENU = "❎ Закрыть";

export class AddVehicleCommand extends Command {
  constructor(bot: Telegraf<IBotContext>, botService: BotService) {
    super(bot, botService);
  }

  async clearMessages(ctx: any) {
    for (const group of ctx.session.mediaGroupsMessage) {
      for (const message of group) {
        try {
          ctx.deleteMessage(message.message_id);
        } catch {}
      }
    }
    for (const message of ctx.session.anyMessagesToDelete) {
      try {
        ctx.deleteMessage(message.message_id);
      } catch {}
    }
    ctx.session.anyMessagesToDelete = [];
  }

  handle(): void {
    this.bot.action("close_edit_scene", async (ctx) => {
      await this.clearMessages(ctx);
      ctx.scene.leave();
      ctx.scene.enter("add_vehicle_scene");
      ctx.wizard.cursor = 1;
    });

    this.bot.action("edit_stars", (ctx) => ctx.scene.enter("edit_stars_scene"));
    this.bot.action("edit_mileage", (ctx) =>
      ctx.scene.enter("edit_mileage_scene"),
    );
    this.bot.action("edit_year", (ctx) => ctx.scene.enter("edit_year_scene"));

    this.bot.action("edit_info", (ctx) => ctx.scene.enter("edit_descr_scene"));

    this.bot.action("edit_mark", (ctx) => ctx.scene.enter("edit_mark_scene"));
    this.bot.action("edit_model", (ctx) => ctx.scene.enter("edit_model_scene"));

    this.bot.action("attach_remote_report", (ctx) =>
      ctx.scene.enter("attach_remote_report_scene"),
    );

    this.bot.action("setup_url_vin", (ctx) =>
      ctx.scene.enter("setup_url_vin_scene"),
    );

    this.bot.action("go_to_vehicles_scene", (ctx) =>
      ctx.scene.enter("my_vehicles_scene"),
    );
    this.bot.action("edit_content", async (ctx) => {
      for (const group of ctx.session.mediaGroupsMessage) {
        for (const message of group)
          try {
            await ctx.deleteMessage(message.message_id);
          } catch {}
      }
      for (const message of ctx.session.anyMessagesToDelete) {
        try {
          await ctx.deleteMessage(message.message_id);
        } catch {}
      }
      ctx.session.anyMessagesToDelete = [];

      ctx.scene.enter("edit_content_scene");
    });

    this.bot.action("go_back_from_view_photos", async (ctx) => {
      for (const group of ctx.session.mediaGroupsMessage.reverse()) {
        for (const message of group) {
          try {
            ctx.deleteMessage(message.message_id);
          } catch {}
        }
      }
      for (const message of ctx.session.anyMessagesToDelete.reverse()) {
        try {
          ctx.deleteMessage(message.message_id);
        } catch {}
      }
      ctx.session.anyMessagesToDelete = [];

      ctx.scene.enter("add_vehicle_scene");
    });

    // Helper function to create a delay
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    this.bot.action("view_vehicle_photos", async (ctx) => {
      const vehicleID = ctx.session.currentVehicleID;
      ctx.session.mediaGroupsMessage = [];

      if (!vehicleID) {
        await ctx.reply("Пожалуйста, выберите авто.");
        return;
      }

      const photos = await this.botService.getPhotosOfVehicle(vehicleID);

      const chunkArray = (array: any[], chunkSize: number) => {
        const result = [];
        for (let i = 0; i < array.length; i += chunkSize) {
          result.push(array.slice(i, i + chunkSize));
        }
        return result;
      };

      if (photos.length > 0) {
        const sendMediaGroups = async (ctx: any, photos: string[]) => {
          const mediaChunks = chunkArray(
            photos.filter((photo) => photo.includes("photos/")),
            10,
          );

          for (const chunk of mediaChunks) {
            const mediaGroup: MediaGroup = chunk.map((photo) => {
              let media = photo.replace(
                "photos/",
                "https://avtopodborbot.igor-n-kuz8044.workers.dev/download/",
              );
              media += "/";
              media += "photo";
              return {
                type: "photo",
                media: media,
              };
            });

            try {
              ctx.session.mediaGroupsMessage.push(
                await ctx.telegram.sendMediaGroup(ctx.chat!.id, mediaGroup),
              );
            } catch (error) {
              console.error("Error sending media group:", error);
              await ctx.reply("❌ Ошибка при отправке альбома фотографий.");
            }

            // Add a delay between each batch to avoid hitting rate limits
            await delay(3500);
          }
        };

        // Handling video URLs
        const videoUrls = photos
          .filter((photo) => photo.includes("videos/"))
          .map((video, index) => {
            let url = video.replace(
              "videos/",
              "https://avtopodborbot.igor-n-kuz8044.workers.dev/download/",
            );
            url += "/";
            url += "video";
            return `<a href="${url}">Смотреть видео ${index + 1}</a>`;
          });

        // Create a message with numbered video links
        const videoMessage =
          videoUrls.length > 0 ? "📹 Видео:\n" + videoUrls.join("\n") : "";

        try {
          try {
            await ctx.deleteMessage();
          } catch {}

          // Send photo albums
          await sendMediaGroups(ctx, photos);

          // Send the video links as a text message
          if (videoMessage) {
            ctx.session.anyMessagesToDelete.push(
              await ctx.reply(videoMessage, { parse_mode: "HTML" }),
            );
          }

          ctx.session.canBeEditedMessage = await ctx.reply("✅ Доставлено!", {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "Назад",
                    callback_data: "go_back_from_view_photos",
                  },
                  {
                    text: "Редактировать",
                    callback_data: "edit_content",
                  },
                ],
              ],
            },
          });
        } catch (error) {
          console.error("Error sending photo album:", error);
          await ctx.reply("❌ Не удалось отправить альбом фотографий.");
        }
      } else {
        ctx.session.anyMessagesToDelete.push(
          await ctx.reply("Фотографии отсутствуют."),
        );
      }
    });
  }

  scenes(): Scenes.WizardScene<IBotContext>[] {
    const addVehicleHandler = new Composer<IBotContext>();
    const editDescrHandler = new Composer<IBotContext>();
    const editMarkHandler = new Composer<IBotContext>();
    const editModelHandler = new Composer<IBotContext>();

    const editYearHandler = new Composer<IBotContext>();
    const editMileageHandler = new Composer<IBotContext>();
    const editStarsHandler = new Composer<IBotContext>();

    const attachRemoteReportHandler = new Composer<IBotContext>();
    const setupURLVinHandler = new Composer<IBotContext>();

    const addVehicleScene = new Scenes.WizardScene<IBotContext>(
      "add_vehicle_scene",
      async (ctx) => {
        // const loadingMessage = await ctx.reply("Загружаем авто");

        const vehicle = await this.botService.getVehicleById(
          ctx.session.currentVehicleID,
        );

        const vehicleDesc = vehicle.description;
        let message = constructLinkForVehicle(vehicle);
        message += ` \nДобавлено: <i>${dateFormatter(vehicle.created_at)}</i>\n\n`;
        message += `Марка: ${vehicle.mark || "Н/Д"}`;
        message += `\nМодель: ${vehicle.model || "Н/Д"}`;
        message += `\nПробег: ${vehicle.mileage || "Н/Д"}`;
        message += `\nГод: ${vehicle.year || "Н/Д"}`;

        const maxStars = 7;
        const filledStar = "⭐";
        const emptyStar = "☆";

        const stars = vehicle.stars ?? "Н/Д";
        const starDisplay =
          typeof stars === "number"
            ? filledStar.repeat(stars) + emptyStar.repeat(maxStars - stars)
            : stars;

        message += `\nБалл: ${starDisplay}`;
        if (vehicleDesc) {
          message += `\n\nОписание:\n${vehicleDesc}\n\n`;
        } else {
          message += "\n\nОписание отсутствует.\n\n";
        }

        if (vehicle.remote_report_link) {
          message += `Отчет: \n${vehicle.remote_report_link}\n\n`;
        }
        // const photoLinks = vehicleData ? vehicleData.match(/Photo: .*/g) : [];
        // const photoCount = photoLinks ? photoLinks.length : 0;

        // message += `Загружено фото: ${photoCount}\n`;

        await ctx.replyOrEditMessage(
          message, // New content
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "📷 Добавить",
                    callback_data: "attach_photos",
                  },
                  {
                    text: "📷 Показать",
                    callback_data: "view_vehicle_photos",
                  },
                  // { text: "Прикрепить видео", callback_data: "attach_video" },
                ],
                [
                  { text: "🛠️ Описание", callback_data: "edit_info" },
                  {
                    text: "🆔 URL/VIN",
                    callback_data: "setup_url_vin",
                  },
                ],
                [
                  { text: "🚗 Марка", callback_data: "edit_mark" },
                  {
                    text: "🚘 Модель",
                    callback_data: "edit_model",
                  },
                ],
                [
                  { text: "📅 Год", callback_data: "edit_year" },
                  {
                    text: "🧭 Пробег",
                    callback_data: "edit_mileage",
                  },
                ],
                [
                  {
                    text: "📝 Внешний отчет",
                    callback_data: "attach_remote_report",
                  },
                ],
                [
                  {
                    text: "⭐ Баллы",
                    callback_data: "edit_stars",
                  },
                ],

                [{ text: "↩️ Назад", callback_data: "go_to_vehicles_scene" }],
              ],
            },
            parse_mode: "HTML",
          },
        );
        ctx.scene.leave();
      },
    );

    editDescrHandler.on("text", async (ctx) => {
      const description = ctx.message.text;
      const currentVehicleID = ctx.session.currentVehicleID;
      this.botService.addDescriptionToVehicle(
        description || "",
        currentVehicleID,
      );
      try {
        ctx.deleteMessage();
      } catch {}

      await this.clearMessages(ctx);

      ctx.scene.leave();
      ctx.scene.enter("add_vehicle_scene");
      ctx.wizard.cursor = 1;
    });

    editMarkHandler.on("text", async (ctx) => {
      const mark = ctx.message.text;
      const currentVehicleID = ctx.session.currentVehicleID;
      this.botService.addMarkToVehicle(mark || "", currentVehicleID);

      try {
        ctx.deleteMessage();
      } catch {}
      await this.clearMessages(ctx);
      ctx.scene.leave();
      ctx.scene.enter("add_vehicle_scene");
      ctx.wizard.cursor = 1;
    });

    editModelHandler.on("text", async (ctx) => {
      const model = ctx.message.text;
      const currentVehicleID = ctx.session.currentVehicleID;
      this.botService.addModelToVehicle(model || "", currentVehicleID);
      try {
        ctx.deleteMessage();
      } catch {}
      await this.clearMessages(ctx);

      ctx.scene.leave();
      ctx.scene.enter("add_vehicle_scene");
      ctx.wizard.cursor = 1;
    });

    setupURLVinHandler.on("text", async (ctx) => {
      const data = ctx.message.text;
      const currentVehicleID = ctx.session.currentVehicleID;

      try {
        await this.botService.editVehicleUrlOrVin(data, currentVehicleID);
      } catch {
        try {
          ctx.deleteMessage();
        } catch {}
        ctx.session.anyMessagesToDelete.push(
          await ctx.reply(
            "Введён некорректный URL, VIN или номер кузова. Попробуй ещё раз.",
          ),
        );
        return;
      }
      try {
        ctx.deleteMessage();
      } catch {}

      await this.clearMessages(ctx);

      ctx.scene.leave();
      ctx.scene.enter("add_vehicle_scene");
      ctx.wizard.cursor = 1;
    });

    attachRemoteReportHandler.on("text", async (ctx) => {
      const reportLink = ctx.message.text;
      const currentVehicleID = ctx.session.currentVehicleID;
      this.botService.addRemoteReportLinkToVehicle(
        reportLink || "",
        currentVehicleID,
      );

      try {
        ctx.deleteMessage();
      } catch {}
      await this.clearMessages(ctx);

      ctx.scene.leave();
      ctx.scene.enter("add_vehicle_scene");
      ctx.wizard.cursor = 1;
    });

    editYearHandler.on("text", async (ctx) => {
      const yearText = ctx.message.text;
      const year = parseInt(yearText, 10);
      const currentVehicleID = ctx.session.currentVehicleID;

      // Validate that the year is an integer and within a reasonable range (e.g., 1900 to the current year)
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1900 || year > currentYear) {
        await ctx.reply("Пожалуйста, введите корректный год (например, 2021).");
        return;
      }

      await this.botService.addYearToVehicle(year, currentVehicleID);

      try {
        ctx.deleteMessage();
      } catch {}
      await this.clearMessages(ctx);

      ctx.scene.leave();
      ctx.scene.enter("add_vehicle_scene");
      ctx.wizard.cursor = 1;
    });
    editMileageHandler.on("text", async (ctx) => {
      const mileageText = ctx.message.text;
      const mileage = parseInt(mileageText, 10);
      const currentVehicleID = ctx.session.currentVehicleID;
      try {
        ctx.deleteMessage();
      } catch {}
      // Validate that mileage is an integer and non-negative
      if (isNaN(mileage) || mileage < 0) {
        ctx.session.anyMessagesToDelete.push(
          await ctx.reply(
            "Пожалуйста, введите корректный пробег (например, 150000).",
          ),
        );
        return;
      }

      await this.botService.addMileageToVehicle(mileage, currentVehicleID);

      this.clearMessages(ctx);

      ctx.scene.leave();
      ctx.scene.enter("add_vehicle_scene");
      ctx.wizard.cursor = 1;
    });
    editStarsHandler.on("text", async (ctx) => {
      const starsText = ctx.message.text;
      const stars = parseInt(starsText, 10);
      const currentVehicleID = ctx.session.currentVehicleID;
      try {
        ctx.deleteMessage();
      } catch {}
      // Validate that stars is an integer between 1 and 7
      if (isNaN(stars) || stars < 1 || stars > 7) {
        ctx.session.anyMessagesToDelete.push(
          await ctx.reply("Пожалуйста, введите количество баллов от 1 до 7."),
        );
        return;
      }

      await this.botService.addStarsToVehicle(stars, currentVehicleID);

      await this.clearMessages(ctx);
      ctx.scene.leave();
      ctx.scene.enter("add_vehicle_scene");
      ctx.wizard.cursor = 1;
    });

    const editDescScene = new Scenes.WizardScene<IBotContext>(
      "edit_descr_scene",
      async (ctx) => {
        const description = await this.botService.getDescriptionByVehicle(
          ctx.session.currentVehicleID,
        );

        if (description && description.length > 0) {
          try {
            ctx.deleteMessage();
          } catch {}
          ctx.session.anyMessagesToDelete.push(
            await ctx.reply("Текущее описание:"),
          );
          ctx.session.anyMessagesToDelete.push(
            await ctx.reply(`${description}`),
          );
        }
        await ctx.replyOrEditMessage("Введите описание для этого автомобиля:", {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: CLOSE_MENU,
                  callback_data: "close_edit_scene",
                },
              ],
            ],
          },
        });
        return ctx.wizard.next();
      },
      editDescrHandler,
    );

    const editMarkScene = new Scenes.WizardScene<IBotContext>(
      "edit_mark_scene",
      async (ctx) => {
        const mark = await this.botService.getMarkByVehicle(
          ctx.session.currentVehicleID,
        );

        if (mark && mark.length > 0) {
          try {
            ctx.deleteMessage();
          } catch {}
          ctx.session.anyMessagesToDelete.push(
            await ctx.reply("Текущая марка:"),
          );
          ctx.session.anyMessagesToDelete.push(await ctx.reply(`${mark}`));
        }
        await ctx.replyOrEditMessage("Введите марку автомобиля:", {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: CLOSE_MENU,
                  callback_data: "close_edit_scene",
                },
              ],
            ],
          },
        });

        return ctx.wizard.next();
      },
      editMarkHandler,
    );

    const editModelScene = new Scenes.WizardScene<IBotContext>(
      "edit_model_scene",
      async (ctx) => {
        const model = await this.botService.getModelByVehicle(
          ctx.session.currentVehicleID,
        );

        if (model && model.length > 0) {
          try {
            ctx.deleteMessage();
          } catch {}
          ctx.session.anyMessagesToDelete.push(
            await ctx.reply("Текущая модель:"),
          );
          ctx.session.anyMessagesToDelete.push(await ctx.reply(`${model}`));
        }
        await ctx.replyOrEditMessage("Введите модель автомобиля:", {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: CLOSE_MENU,
                  callback_data: "close_edit_scene",
                },
              ],
            ],
          },
        });
        return ctx.wizard.next();
      },
      editModelHandler,
    );

    const attachRemoteReportScene = new Scenes.WizardScene<IBotContext>(
      "attach_remote_report_scene",
      async (ctx) => {
        await ctx.replyOrEditMessage("Присылай ссылку на отчет:", {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: CLOSE_MENU,
                  callback_data: "close_edit_scene",
                },
              ],
            ],
          },
        });
        return ctx.wizard.next();
      },
      attachRemoteReportHandler,
    );

    const setupUrlVinScene = new Scenes.WizardScene<IBotContext>(
      "setup_url_vin_scene",
      async (ctx) => {
        await ctx.replyOrEditMessage("Введите URL или VIN:", {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: CLOSE_MENU,
                  callback_data: "close_edit_scene",
                },
              ],
            ],
          },
        });
        return ctx.wizard.next();
      },
      setupURLVinHandler,
    );

    const editMileageScene = new Scenes.WizardScene<IBotContext>(
      "edit_mileage_scene",
      async (ctx) => {
        await ctx.replyOrEditMessage("Укажите пробег:", {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: CLOSE_MENU,
                  callback_data: "close_edit_scene",
                },
              ],
            ],
          },
        });
        return ctx.wizard.next();
      },
      editMileageHandler,
    );

    const editYearScene = new Scenes.WizardScene<IBotContext>(
      "edit_year_scene",
      async (ctx) => {
        await ctx.replyOrEditMessage("Укажите год выпуска авто:", {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: CLOSE_MENU,
                  callback_data: "close_edit_scene",
                },
              ],
            ],
          },
        });
        return ctx.wizard.next();
      },
      editYearHandler,
    );

    const editStarsScene = new Scenes.WizardScene<IBotContext>(
      "edit_stars_scene",
      async (ctx) => {
        await ctx.replyOrEditMessage("Оцените авто от 1 до 7:", {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: CLOSE_MENU,
                  callback_data: "close_edit_scene",
                },
              ],
            ],
          },
        });
        return ctx.wizard.next();
      },
      editStarsHandler,
    );

    return [
      addVehicleScene,
      editDescScene,
      setupUrlVinScene,
      attachRemoteReportScene,
      editMarkScene,
      editModelScene,
      editMileageScene,
      editYearScene,
      editStarsScene,
    ];
  }
}
