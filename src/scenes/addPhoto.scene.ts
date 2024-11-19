import { IBotContext } from "../context/context.interface";
import { BotService } from "../services/botservice";
import { Telegraf } from "telegraf";
import { Scenes } from "telegraf";
import { Scene } from "./scene.class";
import { Composer } from "telegraf";
import { mainMenu } from "../utils/menuKeyboard";
import { clearMessages } from "../utils/clearMessages";
import { uploadUserPhotos } from "../utils/uploadUserPhotos";

export class AddPhotoScene extends Scene {
  constructor(bot: Telegraf<IBotContext>, botService: BotService) {
    super(bot, botService, [
      AddPhotoScene.sceneOne(),
      AddPhotoScene.sceneTwo(botService),
    ]);
  }

  public static sceneName = "add_photo_scene";

  actions(): void {}

  static sceneOne(): Composer<IBotContext> {
    return new Composer<IBotContext>().use(async (ctx) => {
      ctx.session.anyMessagesToDelete.push(
        await ctx.reply(
          "Присылай фото или видео. Если будет видео, то процесс заливки займет больше времени, так как нам надо будет его немного поджать, а это занимает время.",
          {
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
          },
        ),
      );
      return ctx.wizard.next();
    });
  }

  static sceneTwo(botService: BotService): Composer<IBotContext> {
    const addPhotoDescrHandler = new Composer<IBotContext>();

    addPhotoDescrHandler.hears(
      ["Жми, когда все загрузится", "Жми, для возврата назад"],
      async (ctx) => {
        // try {
        //   await ctx.deleteMessage();
        // } catch {}
        await clearMessages(ctx);
        await mainMenu(ctx);

        await ctx.scene.leave();
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
            await botService.downloadFileFromTelegramAndSaveToDatastore(
              fileLink,
              filename.fileId,
              filename.type,
            );
          await botService.addPhotoToVehicle(
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

    return addPhotoDescrHandler;
  }
}
