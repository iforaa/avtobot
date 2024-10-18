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
    this.bot.action("go_to_start_scene", (ctx) =>
      ctx.scene.enter("start_scene"),
    );
    this.bot.action("view_vehicle_photos", async (ctx) => {
      const vehicleUrl = ctx.session.currentVehicleUrl;

      if (!vehicleUrl) {
        await ctx.reply("Пожалуйста, выберите авто.");
        return;
      }
      const photos = await this.botService.getPhotosOfVehicle(vehicleUrl);

      if (photos.length > 0) {
        const mediaGroup: MediaGroup = photos.slice(0, 10).map((photo) => {
          return {
            type: "photo",
            media: photo.replace(
              "photos/",
              "https://avtopodborbot.igor-n-kuz8044.workers.dev/downloadphoto/",
            ), // Directly provide the URL string
          };
        });

        // Send the photos as an album
        try {
          await ctx.telegram.sendMediaGroup(ctx.chat!.id, mediaGroup);
          await ctx.reply("✅ Фотки доставлены!");
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

    const addVehicleScene = new Scenes.WizardScene<IBotContext>(
      "add_vehicle_scene",
      async (ctx) => {
        const loadingMessage = await ctx.reply("Загружаем авто");

        const vehicle = await this.botService.getVehicleByProvidedData(
          ctx.session.currentVehicleUrl,
        );

        const vehicleUrl = vehicle.url;
        const vehicleDesc = vehicle.description;

        let message = `Информация о машине по ссылке: ${vehicleUrl}\n\n`;

        if (vehicleDesc) {
          message += `Описание:\n${vehicleDesc}\n\n`;
        } else {
          message += "Описание отсутствует.\n\n";
        }

        // const photoLinks = vehicleData ? vehicleData.match(/Photo: .*/g) : [];
        // const photoCount = photoLinks ? photoLinks.length : 0;

        // message += `Загружено фото: ${photoCount}\n`;

        await ctx.telegram.editMessageText(
          loadingMessage.chat.id, // Chat ID
          loadingMessage.message_id, // Message ID to edit
          undefined, // No inline message ID
          message, // New content
          {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "Прикрепить фото", callback_data: "attach_photos" },
                  {
                    text: "Показать Фото",
                    callback_data: "view_vehicle_photos",
                  },
                  // { text: "Прикрепить видео", callback_data: "attach_video" },
                ],
                [{ text: "Добавить описание", callback_data: "edit_info" }],
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
      const currentVehicleUrl = ctx.session.currentVehicleUrl;
      this.botService.addDescriptionToVehicle(
        description || "",
        currentVehicleUrl,
      );

      await ctx.reply("Описание добавлено успешно!");
      ctx.scene.leave();
      ctx.scene.enter("add_vehicle_scene");
      ctx.wizard.cursor = 1;
    });

    const editDescScene = new Scenes.WizardScene<IBotContext>(
      "edit_descr_scene",
      async (ctx) => {
        await ctx.reply("Введите описание для этого автомобиля:");
        return ctx.wizard.next();
      },
      editDescrHandler,
    );

    return [addVehicleScene, editDescScene];
  }
}
