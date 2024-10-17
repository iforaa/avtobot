import { Composer, Markup, Scenes, Telegraf } from "telegraf";
import { Command } from "./command.class";
import { IBotContext } from "../context/context.interface";
import { cleanUrl } from "../utils/cleanurl";
import { BotService } from "../services/botservice";
import { WizardContext } from "telegraf/typings/scenes";
// import { downloadAndSaveFile } from "../utils/downloadAndSaveFile";
import { URL } from "url";

export class AddPhotoCommand extends Command {
  constructor(bot: Telegraf<IBotContext>, botService: BotService) {
    super(bot, botService);
  }

  handle(): void {
    this.bot.action("attach_photos", (ctx) =>
      ctx.scene.enter("add_photo_scene"),
    );

    this.bot.action("add_another_photo", async (ctx) => {
      await ctx.scene.leave();
      await ctx.reply("Шли еще");
      return await ctx.scene.enter("add_photo_scene");
    });

    this.bot.action("go_back", async (ctx) => {
      await ctx.scene.leave();
      return await ctx.scene.enter("add_vehicle_scene");
    });
  }

  scenes(): Scenes.WizardScene<IBotContext>[] {
    const addPhotoDescrHandler = new Composer<IBotContext>();
    const addAnotherPhotoDescrHandler = new Composer<IBotContext>();

    addPhotoDescrHandler.on("photo", async (ctx) => {
      const vehicleUrl = ctx.session.currentVehicleUrl;

      if (!vehicleUrl) {
        await ctx.reply("Выбери авто для начала.");
        return;
      }

      const photos = ctx.message.photo;

      // Select only the largest version of the photo (the last one in the array)
      const largestPhoto = photos[photos.length - 1];
      const fileId = largestPhoto.file_id;

      const fileLink: URL = await ctx.telegram.getFileLink(fileId);
      console.log("testing file linking");
      console.log(fileLink.toString());

      const datastoreFilename =
        await this.botService.downloadFileFromTelegramAndSaveToDatastore(
          fileLink,
          fileId,
        );
      await this.botService.addPhotoToVehicle(datastoreFilename, vehicleUrl);

      await ctx.reply("Фото добавлено!");

      await ctx.reply("Хочешь добавить еще фото или вернуться обратно?", {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Добавить еще фото",
                callback_data: "add_another_photo",
              },
            ],
            [{ text: "Назад", callback_data: "go_back" }],
          ],
        },
      });
    });

    const addPhotoScene = new Scenes.WizardScene<IBotContext>(
      "add_photo_scene",
      async (ctx) => {
        await ctx.reply("Присылай фото, по одной");
        return ctx.wizard.next();
      },
      addPhotoDescrHandler,
      addAnotherPhotoDescrHandler,
    );

    return [addPhotoScene];
  }
}
