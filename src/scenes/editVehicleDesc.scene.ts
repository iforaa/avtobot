import { IBotContext } from "../context/context.interface";
import { BotService } from "../services/botservice";
import { Telegraf } from "telegraf";
import { Scenes } from "telegraf";
import { Scene } from "./scene.class";
import { Composer } from "telegraf";
import { clearMessages } from "../utils/clearMessages";
import { CLOSE_MENU } from "../utils/menuKeyboard";

export class EditVehicleDescScene extends Scene {
  constructor(bot: Telegraf<IBotContext>, botService: BotService) {
    super(bot, botService, [
      EditVehicleDescScene.sceneOne(botService),
      EditVehicleDescScene.sceneTwo(botService),
    ]);
  }

  public static sceneName = "edit_vehicle_desc_scene";

  actions(): void {
    this.bot.action("edit_info", (ctx) =>
      ctx.scene.enter("edit_vehicle_desc_scene"),
    );
  }

  static sceneOne(botService: BotService): Composer<IBotContext> {
    return new Composer<IBotContext>().use(async (ctx) => {
      const description = await botService.getDescriptionByVehicle(
        ctx.session.currentVehicleID,
      );

      if (description && description.length > 0) {
        try {
          ctx.deleteMessage();
        } catch {}
        ctx.session.anyMessagesToDelete.push(
          await ctx.reply("Текущее описание:"),
        );
        ctx.session.anyMessagesToDelete.push(await ctx.reply(`${description}`));
      }
      await ctx.replyOrEditMessage("Введите описание для этого автомобиля:", {
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
      const description = ctx.message.text;
      const currentVehicleID = ctx.session.currentVehicleID;
      botService.addDescriptionToVehicle(description || "", currentVehicleID);
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
