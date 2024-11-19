import { IBotContext } from "../context/context.interface";
import { BotService } from "../services/botservice";
import { Telegraf } from "telegraf";
import { Scenes } from "telegraf";
import { Scene } from "./scene.class";
import { Composer } from "telegraf";
import { clearMessages } from "../utils/clearMessages";
import { CLOSE_MENU } from "../utils/menuKeyboard";

export class EditVehicleYearScene extends Scene {
  constructor(bot: Telegraf<IBotContext>, botService: BotService) {
    super(bot, botService, [
      EditVehicleYearScene.sceneOne(),
      EditVehicleYearScene.sceneTwo(botService),
    ]);
  }

  public static sceneName = "edit_vehicle_year_scene";

  actions(): void {
    this.bot.action("edit_year", (ctx) =>
      ctx.scene.enter("edit_vehicle_year_scene"),
    );
  }

  static sceneOne(): Composer<IBotContext> {
    return new Composer<IBotContext>().use(async (ctx) => {
      await ctx.replyOrEditMessage("Укажите год выпуска авто:", {
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
      const yearText = ctx.message.text;
      const year = parseInt(yearText, 10);
      const currentVehicleID = ctx.session.currentVehicleID;

      // Validate that the year is an integer and within a reasonable range (e.g., 1900 to the current year)
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1900 || year > currentYear) {
        await ctx.reply("Пожалуйста, введите корректный год (например, 2021).");
        return;
      }

      await botService.addYearToVehicle(year, currentVehicleID);

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
