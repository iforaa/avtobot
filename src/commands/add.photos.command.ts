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

    addPhotoDescrHandler.hears("Жми, когда все загрузится", async (ctx) => {
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
      });

      ctx.scene.leave();
      return await ctx.scene.enter("add_vehicle_scene");
    });
    addPhotoDescrHandler.on(["photo", "video"], async (ctx) => {
      const vehicleID = ctx.session.currentVehicleID;

      if (!vehicleID) {
        await ctx.reply("Выбери авто для начала.");
        return;
      }

      uploadUserPhotos(ctx.message, async (filenames) => {
        await ctx.reply("Закидываем партию на сервер");

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
        await ctx.reply("Партия загружена");
      });
    });

    const addPhotoScene = new Scenes.WizardScene<IBotContext>(
      "add_photo_scene",
      async (ctx) => {
        await ctx.reply("Присылай фото или видео", {
          reply_markup: {
            keyboard: [
              [
                {
                  text: "Жми, когда все загрузится",
                },
              ],
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        });
        return ctx.wizard.next();
      },
      addPhotoDescrHandler,
    );

    return [addPhotoScene];
  }
}
