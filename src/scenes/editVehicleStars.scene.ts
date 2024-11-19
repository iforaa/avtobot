import { IBotContext } from "../context/context.interface";
import { BotService } from "../services/botservice";
import { Telegraf } from "telegraf";
import { Scenes } from "telegraf";
import { Scene } from "./scene.class";
import { Composer } from "telegraf";
import { clearMessages } from "../utils/clearMessages";
import { CLOSE_MENU } from "../utils/menuKeyboard";

export class EditVehicleStarsScene extends Scene {
  constructor(bot: Telegraf<IBotContext>, botService: BotService) {
    super(bot, botService, [
      EditVehicleStarsScene.sceneOne(),
      EditVehicleStarsScene.sceneTwo(botService),
    ]);
  }

  public static sceneName = "edit_vehicle_stars_scene";

  actions(): void {
    this.bot.action("edit_stars", (ctx) =>
      ctx.scene.enter("edit_vehicle_stars_scene"),
    );
  }

  static sceneOne(): Composer<IBotContext> {
    return new Composer<IBotContext>().use(async (ctx) => {
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
    });
  }

  static sceneTwo(botService: BotService): Composer<IBotContext> {
    return new Composer<IBotContext>().on("text", async (ctx) => {
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

      await botService.addStarsToVehicle(stars, currentVehicleID);

      await clearMessages(ctx);
      ctx.scene.leave();
      ctx.scene.enter("add_vehicle_scene");
      ctx.wizard.cursor = 1;
    });
  }
}
