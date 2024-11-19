import { IBotContext } from "../context/context.interface";
import { BotService } from "../services/botservice";
import { Telegraf } from "telegraf";
import { Scenes } from "telegraf";
import { Scene } from "./scene.class";
import { Composer } from "telegraf";
import { clearMessages } from "../utils/clearMessages";
import { CLOSE_MENU } from "../utils/menuKeyboard";

export class EditVehicleModelScene extends Scene {
  constructor(bot: Telegraf<IBotContext>, botService: BotService) {
    super(bot, botService, [
      EditVehicleModelScene.sceneOne(botService),
      EditVehicleModelScene.sceneTwo(botService),
    ]);
  }

  public static sceneName = "edit_vehicle_model_scene";

  actions(): void {
    this.bot.action("edit_model", (ctx) =>
      ctx.scene.enter("edit_vehicle_model_scene"),
    );
  }

  static sceneOne(botService: BotService): Composer<IBotContext> {
    return new Composer<IBotContext>().use(async (ctx) => {
      const model = await botService.getModelByVehicle(
        ctx.session.currentVehicleID,
      );

      if (model && model.length > 0) {
        try {
          ctx.deleteMessage();
        } catch {}
        ctx.session.anyMessagesToDelete.push(
          await ctx.reply("Текущая модель:"),
        );
        ctx.session.anyMessagesToDelete.push(await ctx.reply(`${model}`));
      }
      await ctx.replyOrEditMessage("Введите модель автомобиля:", {
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
      const model = ctx.message.text;
      const currentVehicleID = ctx.session.currentVehicleID;
      botService.addModelToVehicle(model || "", currentVehicleID);
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
