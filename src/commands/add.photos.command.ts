import { Composer, Markup, Scenes, Telegraf } from "telegraf";
import { Command } from "./command.class";
import { IBotContext } from "../context/context.interface";
import { cleanUrl } from "../utils/cleanurl";
import { BotService } from "../services/botservice";
import { WizardContext } from "telegraf/typings/scenes";
// import { downloadAndSaveFile } from "../utils/downloadAndSaveFile";
import { URL } from "url";
import { uploadUserPhotos } from "../utils/uploadUserPhotos";

export class AddPhotoCommand extends Command {
  constructor(bot: Telegraf<IBotContext>, botService: BotService) {
    super(bot, botService);
  }

  handle(): void {
    this.bot.action("attach_photos", (ctx) =>
      ctx.scene.enter("add_photo_scene"),
    );

    this.bot.action("go_to_add_vehicle_scene", async (ctx) => {
      await ctx.scene.leave();
      return await ctx.scene.enter("add_vehicle_scene");
    });
  }

  scenes(): Scenes.WizardScene<IBotContext>[] {
    const addPhotoDescrHandler = new Composer<IBotContext>();
    const addAnotherPhotoDescrHandler = new Composer<IBotContext>();

    addPhotoDescrHandler.on(["photo", "video"], async (ctx) => {
      const vehicleID = ctx.session.currentVehicleID;

      if (!vehicleID) {
        await ctx.reply("Выбери авто для начала.");
        return;
      }

      uploadUserPhotos(ctx.message, async (filenames) => {
        await ctx.reply("Переливаем на наш сервер, подожди");
        for (const filename of filenames) {
          const fileLink: URL = await ctx.telegram.getFileLink(filename.fileId);
          const datastoreFilename =
            await this.botService.downloadFileFromTelegramAndSaveToDatastore(
              fileLink,
              filename.fileId,
              filename.type,
            );
          await this.botService.addPhotoToVehicle(datastoreFilename, vehicleID);
        }
        ctx.session.canBeEditedMessage = await ctx.reply("Загружаем");
        ctx.scene.leave();
        return await ctx.scene.enter("add_vehicle_scene");
      });
    });

    const addPhotoScene = new Scenes.WizardScene<IBotContext>(
      "add_photo_scene",
      async (ctx) => {
        await ctx.reply("Присылай фото или видео");
        return ctx.wizard.next();
      },
      addPhotoDescrHandler,
      addAnotherPhotoDescrHandler,
    );

    return [addPhotoScene];
  }
}
