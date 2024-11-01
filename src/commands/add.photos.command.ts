import { Composer, Markup, Scenes, Telegraf } from "telegraf";
import { Command } from "./command.class";
import { IBotContext } from "../context/context.interface";
import { cleanUrl } from "../utils/cleanurl";
import { BotService } from "../services/botservice";
import { WizardContext } from "telegraf/typings/scenes";
// import { downloadAndSaveFile } from "../utils/downloadAndSaveFile";
import { URL } from "url";
import { uploadUserPhotos } from "../utils/uploadUserPhotos";
import { ALL_CARS_MENU, ADD_CAR_MENU } from "./start.command";
import { MediaGroup } from "telegraf/typings/telegram-types";
import { PhotoSection } from "../utils/photoSection";

export class AddPhotoCommand extends Command {
  constructor(bot: Telegraf<IBotContext>, botService: BotService) {
    super(bot, botService);
  }

  handle(): void {
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    this.bot.action("view_photos", async (ctx) => {
      ctx.scene.enter("photos_scene");
    });

    this.bot.action("go_to_add_vehicle_scene", async (ctx) => {
      await this.clearMessages(ctx);
      await ctx.scene.leave();
      return await ctx.scene.enter("add_vehicle_scene");
    });

    this.bot.action("go_back_from_photos", async (ctx) => {
      for (const message of ctx.session.anyMessagesToDelete.reverse()) {
        try {
          await ctx.deleteMessage(message.message_id);
        } catch {}
      }
      ctx.session.anyMessagesToDelete = [];

      for (const group of ctx.session.mediaGroupsMessage.reverse()) {
        for (const message of group) {
          try {
            await ctx.deleteMessage(message.message_id);
          } catch {}
        }
      }

      ctx.scene.enter("photos_scene");
    });

    this.bot.action(/show_photos_section_(.+)/, async (ctx) => {
      const selectedSection = parseInt(ctx.match[1]); // Extract the model from callback data
      ctx.session.photoSectionNumber = selectedSection;

      const vehicleID = ctx.session.currentVehicleID;
      ctx.session.mediaGroupsMessage = [];
      if (!vehicleID) {
        await ctx.reply("Пожалуйста, выберите авто.");
        return;
      }

      const photos = (
        await this.botService.getPhotosOfVehicle(vehicleID, selectedSection)
      ).map((row: any) => row.photo_url);

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
                    callback_data: "go_back_from_photos",
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

    this.bot.action(/upload_photos_section_(.+)/, async (ctx) => {
      ctx.session.photoSectionNumber = parseInt(ctx.match[1]);
      ctx.scene.enter("add_photo_scene");
    });
  }

  scenes(): Scenes.WizardScene<IBotContext>[] {
    const addPhotoDescrHandler = new Composer<IBotContext>();

    addPhotoDescrHandler.hears(
      ["Жми, когда все загрузится", "Жми, для возврата назад"],
      async (ctx) => {
        // try {
        //   ctx.deleteMessage();
        // } catch {}

        ctx.session.anyMessagesToDelete.push(
          await ctx.reply("🚗🚗🚗", {
            reply_markup: {
              keyboard: [
                [
                  {
                    text: ALL_CARS_MENU,
                  },
                  { text: ADD_CAR_MENU },
                ],
              ],
              resize_keyboard: true,
            },
          }),
        );
        this.clearMessages(ctx);
        ctx.scene.leave();
        return await ctx.scene.enter("photos_scene");
      },
    );
    addPhotoDescrHandler.on(["photo", "video"], async (ctx) => {
      const vehicleID = ctx.session.currentVehicleID;

      if (!vehicleID) {
        await ctx.reply("Выбери авто для начала.");
        return;
      }

      uploadUserPhotos(ctx.message, async (filenames) => {
        ctx.session.anyMessagesToDelete.push(
          await ctx.reply("Закидываем партию на сервер"),
        );

        for (const filename of filenames) {
          const fileLink: URL = await ctx.telegram.getFileLink(filename.fileId);
          const datastoreFilename =
            await this.botService.downloadFileFromTelegramAndSaveToDatastore(
              fileLink,
              filename.fileId,
              filename.type,
            );
          await this.botService.addPhotoToVehicle(
            datastoreFilename,
            vehicleID,
            ctx.session.photoSectionNumber,
          );
        }
        ctx.session.anyMessagesToDelete.push(
          await ctx.reply("Партия загружена"),
        );
      });
    });

    const addPhotoScene = new Scenes.WizardScene<IBotContext>(
      "add_photo_scene",
      async (ctx) => {
        // try {
        //   ctx.deleteMessage();
        // } catch {}
        ctx.session.anyMessagesToDelete.push(
          await ctx.reply("Присылай фото или видео", {
            reply_markup: {
              keyboard: [
                [
                  {
                    text: "Жми, когда все загрузится",
                  },
                ],
                [
                  {
                    text: "Жми, для возврата назад",
                  },
                ],
              ],
              resize_keyboard: true,
              one_time_keyboard: true,
            },
          }),
        );
        return ctx.wizard.next();
      },
      addPhotoDescrHandler,
    );

    const photosScene = new Scenes.WizardScene<IBotContext>(
      "photos_scene",
      async (ctx) => {
        try {
          await ctx.deleteMessage();
        } catch {}

        const vehicleID = ctx.session.currentVehicleID;

        // Retrieve all photos once for the vehicle
        const allPhotos = await this.botService.getPhotosOfVehicle(vehicleID);

        // Calculate total photos count
        const totalPhotosCount = allPhotos.length;

        // Define sections and count photos in each section
        const sections = [
          { name: "Кузов", section: PhotoSection.Kuzov },
          { name: "Подкапотное", section: PhotoSection.Underhood },
          { name: "Салон", section: PhotoSection.Salon },
          { name: "Диагностика", section: PhotoSection.Diagnostic },
          { name: "Маркировки", section: PhotoSection.Marking },
          { name: "Другое", section: PhotoSection.Others },
        ];

        const sectionButtons = sections.map(({ name, section }) => {
          // Count photos in the current section
          const photosInSection = allPhotos.filter(
            (photo) => photo.section === section,
          );
          const photosCount = photosInSection.length;

          return [
            {
              text: `⬆️ ${name}`,
              callback_data: `upload_photos_section_${section}`,
            },
            {
              text: photosCount > 0 ? `👁️ ${name} (${photosCount})` : `🔴`,
              callback_data:
                photosCount > 0 ? `show_photos_section_${section}` : `___`,
            },
          ];
        });

        ctx.session.anyMessagesToDelete.push(
          await ctx.reply(
            `Фотографии и видео должны быть разложены по разделам\nВсего фото и видео: ${totalPhotosCount}`,
            {
              reply_markup: {
                inline_keyboard: [
                  ...sectionButtons,
                  [
                    {
                      text: "↩️ Назад",
                      callback_data: "go_to_add_vehicle_scene",
                    },
                  ],
                ],
              },
            },
          ),
        );

        return ctx.scene.leave();
      },
    );

    return [addPhotoScene, photosScene];
  }

  async clearMessages(ctx: any) {
    try {
      for (const group of ctx.session.mediaGroupsMessage) {
        for (const message of group) {
          try {
            await ctx.deleteMessage(message.message_id);
          } catch {}
        }
      }
      for (const message of ctx.session.anyMessagesToDelete) {
        try {
          await ctx.deleteMessage(message.message_id);
        } catch {}
      }
      ctx.session.anyMessagesToDelete = [];
    } catch {}
  }
}
