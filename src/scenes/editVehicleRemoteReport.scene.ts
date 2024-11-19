import { IBotContext } from "../context/context.interface";
import { BotService } from "../services/botservice";
import { Telegraf } from "telegraf";
import { Scenes } from "telegraf";
import { Scene } from "./scene.class";
import { Composer } from "telegraf";
import { CLOSE_MENU } from "../utils/menuKeyboard";
import { clearMessages } from "../utils/clearMessages";

export class EditVehicleRemoteReportScene extends Scene {
  constructor(bot: Telegraf<IBotContext>, botService: BotService) {
    super(bot, botService, [
      EditVehicleRemoteReportScene.sceneOne(),
      EditVehicleRemoteReportScene.sceneTwo(botService),
    ]);
  }

  public static sceneName = "edit_vehicle_remote_report_scene";

  actions(): void {
    this.bot.action("attach_remote_report", (ctx) =>
      ctx.scene.enter("edit_vehicle_remote_report_scene"),
    );
  }

  static sceneOne(): Composer<IBotContext> {
    return new Composer<IBotContext>().use(async (ctx) => {
      await ctx.replyOrEditMessage("Присылай ссылку на отчет:", {
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
      const reportLink = ctx.message.text;
      const currentVehicleID = ctx.session.currentVehicleID;
      botService.addRemoteReportLinkToVehicle(
        reportLink || "",
        currentVehicleID,
      );

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
