import { Composer, Markup, Scenes, Telegraf } from "telegraf";
import { Command } from "./command.class";
import { IBotContext } from "../context/context.interface";
import { cleanUrl } from "../utils/cleanurl";
import { BotService } from "../services/botservice";
import { WizardContext } from "telegraf/typings/scenes";
import { MediaGroup } from "telegraf/typings/telegram-types";

export class AddVehicleCommand extends Command {
  constructor(bot: Telegraf<IBotContext>, botService: BotService) {
    super(bot, botService);
  }

  handle(): void {
    this.bot.action("edit_info", (ctx) => ctx.scene.enter("edit_descr_scene"));
    this.bot.action("setup_url_vin", (ctx) =>
      ctx.scene.enter("setup_url_vin_scene"),
    );

    this.bot.action("go_to_start_scene", (ctx) =>
      ctx.scene.enter("start_scene"),
    );
    // this.bot.action("edit_photo", async (ctx) => {

    // });
    //
    this.bot.action("go_back_from_view_photos", async (ctx) => {
      try {
        for (const group of ctx.session.mediaGroupsMessage) {
          for (const message of group) {
            await ctx.deleteMessage(message.message_id);
          }
        }
        for (const message of ctx.session.anyMessagesToDelete) {
          await ctx.deleteMessage(message.message_id);
        }
        ctx.session.anyMessagesToDelete = [];
      } catch {}
      ctx.scene.enter("add_vehicle_scene");
    });

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

            ctx.session.mediaGroupsMessage.push(
              await ctx.telegram.sendMediaGroup(ctx.chat!.id, mediaGroup),
            );
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
          await ctx.deleteMessage();
          ctx.session.anyMessagesToDelete = [];

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
                    text: "Редактировать фото",
                    callback_data: "edit_photo",
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
        await ctx.reply("Фотографии отсутствуют.");
      }
    });
  }

  scenes(): Scenes.WizardScene<IBotContext>[] {
    const addVehicleHandler = new Composer<IBotContext>();
    const editDescrHandler = new Composer<IBotContext>();
    const setupURLVinHandler = new Composer<IBotContext>();

    const addVehicleScene = new Scenes.WizardScene<IBotContext>(
      "add_vehicle_scene",
      async (ctx) => {
        // const loadingMessage = await ctx.reply("Загружаем авто");

        const vehicle = await this.botService.getVehicleById(
          ctx.session.currentVehicleID,
        );

        const vehicleDesc = vehicle.description;
        let message = "";
        if (vehicle.url) {
          message = `Ссылка: ${vehicle.url}\n\n`;
        } else {
          message = `Ссылка не установлена\n\n`;
        }

        if (vehicle.vin) {
          message += `VIN: ${vehicle.vin}\n\n`;
        } else {
          message += "VIN номер не прописан.\n\n";
        }

        if (vehicleDesc) {
          message += `Описание:\n${vehicleDesc}\n\n`;
        } else {
          message += "Описание отсутствует.\n\n";
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
                    text: "Прикрепить 📷/🎥",
                    callback_data: "attach_photos",
                  },
                  {
                    text: "Показать 📷/🎥",
                    callback_data: "view_vehicle_photos",
                  },
                  // { text: "Прикрепить видео", callback_data: "attach_video" },
                ],
                [
                  { text: "Добавить описание", callback_data: "edit_info" },
                  {
                    text: "Установить URL/VIN",
                    callback_data: "setup_url_vin",
                  },
                ],

                [{ text: "Назад", callback_data: "go_to_start_scene" }],
              ],
            },
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
      await ctx.reply("Описание добавлено успешно!");

      ctx.session.canBeEditedMessage = await ctx.reply(
        "[место для обновления]",
      );

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
        return await ctx.reply(
          "Введён некорректный URL, VIN или номер кузова. Попробуй ещё раз.",
        );
      }
      await ctx.reply("Обновлено!");

      ctx.session.canBeEditedMessage = await ctx.reply(
        "[место для обновления]",
      );

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
          await ctx.reply("Текущее описание:");
          await ctx.reply(`${description}`);
        }
        await ctx.reply("Введите описание для этого автомобиля:");
        return ctx.wizard.next();
      },
      editDescrHandler,
    );

    const setupUrlVinScene = new Scenes.WizardScene<IBotContext>(
      "setup_url_vin_scene",
      async (ctx) => {
        await ctx.reply("Введите URL или VIN:");
        return ctx.wizard.next();
      },
      setupURLVinHandler,
    );

    return [addVehicleScene, editDescScene, setupUrlVinScene];
  }
}
