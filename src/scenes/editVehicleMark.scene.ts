import { IBotContext } from "../context/context.interface";
import { BotService } from "../services/botservice";
import { Telegraf } from "telegraf";
import { Scenes } from "telegraf";
import { Scene } from "./scene.class";
import { Composer } from "telegraf";
import { CLOSE_MENU } from "../utils/menuKeyboard";
import { clearMessages } from "../utils/clearMessages";

export class EditVehicleMarkScene extends Scene {
  constructor(bot: Telegraf<IBotContext>, botService: BotService) {
    super(bot, botService, [
      EditVehicleMarkScene.sceneOne(botService),
      EditVehicleMarkScene.sceneTwo(botService),
    ]);
  }

  public static sceneName = "edit_vehicle_mark_scene";

  actions(): void {
    this.bot.action("edit_mark", (ctx) =>
      ctx.scene.enter("edit_vehicle_mark_scene"),
    );
  }

  static sceneOne(botService: BotService): Composer<IBotContext> {
    return new Composer<IBotContext>().use(async (ctx) => {
      const mark = await botService.getMarkByVehicle(
        ctx.session.currentVehicleID,
      );

      if (mark && mark.length > 0) {
        try {
          ctx.deleteMessage();
        } catch {}
        ctx.session.anyMessagesToDelete.push(await ctx.reply("Текущая марка:"));
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
    });
  }

  static sceneTwo(botService: BotService): Composer<IBotContext> {
    return new Composer<IBotContext>().on("text", async (ctx) => {
      const mark = ctx.message.text;
      const currentVehicleID = ctx.session.currentVehicleID;
      botService.addMarkToVehicle(mark || "", currentVehicleID);

      try {
        ctx.deleteMessage();
      } catch {}
      await clearMessages(ctx);
      ctx.scene.leave();
      ctx.scene.enter("add_vehicle_scene");
      ctx.wizard.cursor = 1;
    });
  }
}
