import { IBotContext } from "../context/context.interface";
import { BotService } from "../services/botservice";
import { Telegraf } from "telegraf";
import { Scenes } from "telegraf";
import { Scene } from "./scene.class";
import { Composer } from "telegraf";
import { CLOSE_MENU } from "../utils/menuKeyboard";
import { clearMessages } from "../utils/clearMessages";

export class EditVehicleUrlVinScene extends Scene {
  constructor(bot: Telegraf<IBotContext>, botService: BotService) {
    super(bot, botService, [
      EditVehicleUrlVinScene.sceneOne(),
      EditVehicleUrlVinScene.sceneTwo(botService),
    ]);
  }

  public static sceneName = "edit_vehicle_url_vin_scene";

  actions(): void {
    this.bot.action("setup_url_vin", (ctx) =>
      ctx.scene.enter("edit_vehicle_url_vin_scene"),
    );
  }

  static sceneOne(): Composer<IBotContext> {
    return new Composer<IBotContext>().use(async (ctx) => {
      await ctx.replyOrEditMessage("Введите URL или VIN:", {
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
      const data = ctx.message.text;
      const currentVehicleID = ctx.session.currentVehicleID;

      try {
        await botService.editVehicleUrlOrVin(data, currentVehicleID);
      } catch {
        try {
          ctx.deleteMessage();
        } catch {}
        return ctx.session.anyMessagesToDelete.push(
          await ctx.reply(
            "Введён некорректный URL, VIN или номер кузова. Попробуй ещё раз.",
            {
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
            },
          ),
        );
      }
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
