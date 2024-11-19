import { IBotContext } from "../context/context.interface";
import { BotService } from "../services/botservice";
import { Telegraf } from "telegraf";
import { Scenes } from "telegraf";
import { Scene } from "./scene.class";
import { Composer } from "telegraf";
import { PhotoSection } from "../utils/photoSection";
import { clearMessages } from "../utils/clearMessages";
import { MediaGroup } from "telegraf/typings/telegram-types";

export class PhotosScene extends Scene {
  constructor(bot: Telegraf<IBotContext>, botService: BotService) {
    super(bot, botService, [PhotosScene.sceneOne(botService)]);
  }

  public static sceneName = "photos_scene";

  actions(): void {
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

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

    this.bot.action("view_photos", async (ctx) => {
      ctx.scene.enter("photos_scene");
    });

    this.bot.action("go_to_add_vehicle_scene", async (ctx) => {
      await clearMessages(ctx);
      await ctx.scene.leave();
      return await ctx.scene.enter("add_vehicle_scene");
    });

    this.bot.action(/upload_photos_section_(.+)/, async (ctx) => {
      ctx.session.photoSectionNumber = parseInt(ctx.match[1]);
      ctx.scene.leave();
      ctx.scene.enter("add_photo_scene");
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
        selectedSection == 10
          ? await this.botService.getPhotosOfVehicle(vehicleID)
          : await this.botService.getPhotosOfVehicle(vehicleID, selectedSection)
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
                this.botService.datastoreURLFile(),
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
            await delay(2500);
          }
        };

        // Handling video URLs
        const videoUrls = photos
          .filter((photo) => photo.includes("videos/"))
          .map((video, index) => {
            let url = video.replace(
              "videos/",
              this.botService.datastoreURLFile(),
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
  }

  static sceneOne(botService: BotService): Composer<IBotContext> {
    return new Composer<IBotContext>(async (ctx) => {
      try {
        await ctx.deleteMessage();
      } catch {}

      const vehicleID = ctx.session.currentVehicleID;

      // Retrieve all photos once for the vehicle
      const allPhotos = await botService.getPhotosOfVehicle(vehicleID);

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

        const buttons = [];

        if (
          ctx.session.currentVehicle &&
          ctx.session.currentVehicle.user_id === ctx.from?.id
        ) {
          buttons.push({
            text: `⬆️ ${name}`,
            callback_data: `upload_photos_section_${section}`,
          });
        }

        buttons.push({
          text: photosCount > 0 ? `👁️ ${name} (${photosCount})` : `🔴`,
          callback_data:
            photosCount > 0 ? `show_photos_section_${section}` : `___`,
        });

        return buttons;
      });

      if (allPhotos.length > 0) {
        sectionButtons.push([
          { text: "Показать всё", callback_data: "show_photos_section_10" },
        ]);
      }

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
    });
  }
}
