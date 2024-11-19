import { IBotContext } from "../context/context.interface";
import { BotService } from "../services/botservice";
import { Telegraf } from "telegraf";
import { Scenes } from "telegraf";
import { Scene } from "./scene.class";
import { Composer } from "telegraf";
import { CLOSE_MENU } from "../utils/menuKeyboard";
import { clearMessages } from "../utils/clearMessages";

export class EditVehicleMileageScene extends Scene {
  constructor(bot: Telegraf<IBotContext>, botService: BotService) {
    super(bot, botService, [
      EditVehicleMileageScene.sceneOne(),
      EditVehicleMileageScene.sceneTwo(botService),
    ]);
  }

  public static sceneName = "edit_vehicle_mileage_scene";

  actions(): void {
    this.bot.action("edit_mileage", (ctx) =>
      ctx.scene.enter("edit_vehicle_mileage_scene"),
    );
  }

  static sceneOne(): Composer<IBotContext> {
    return new Composer<IBotContext>().use(async (ctx) => {
      await ctx.replyOrEditMessage("Укажите пробег:", {
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
      const mileageText = ctx.message.text;
      const mileage = parseInt(mileageText, 10);
      const currentVehicleID = ctx.session.currentVehicleID;
      try {
        ctx.deleteMessage();
      } catch {}
      // Validate that mileage is an integer and non-negative
      if (isNaN(mileage) || mileage < 0) {
        ctx.session.anyMessagesToDelete.push(
          await ctx.reply(
            "Пожалуйста, введите корректный пробег (например, 150000).",
          ),
        );
        return;
      }

      await botService.addMileageToVehicle(mileage, currentVehicleID);

      await clearMessages(ctx);

      ctx.scene.leave();
      ctx.scene.enter("add_vehicle_scene");
      ctx.wizard.cursor = 1;
    });
  }
}
