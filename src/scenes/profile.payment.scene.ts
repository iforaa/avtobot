import { IBotContext } from "../context/context.interface";
import { BotService } from "../services/botservice";
import { Telegraf } from "telegraf";
import { Scenes } from "telegraf";
import { Scene } from "./scene.class";
import { Composer } from "telegraf";
import { ProfileScene } from "./profile.scene";
import { clearMessages } from "../utils/clearMessages";

export class ProfilePaymentScene extends Scene {
  constructor(bot: Telegraf<IBotContext>, botService: BotService) {
    super(bot, botService, [
      ProfilePaymentScene.sceneOne(),
      ProfilePaymentScene.sceneTwo(botService),
    ]);
  }

  public static sceneName = "setup_payment_method_scene";

  actions(): void {}

  static sceneOne(): Composer<IBotContext> {
    const composer = new Composer<IBotContext>().use(async (ctx) => {
      ctx.session.anyMessagesToDelete.push(
        await ctx.reply(
          "Вы можете продавать свои отчеты. Для этого, укажите номер карты или номер телефона. Эти данные будут показаны покупателю вашего отчета",
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "↩️ Назад",
                    callback_data: "go_back_to_profile_scene",
                  },
                ],
              ],
            },
          },
        ),
      );
      return ctx.wizard.next();
    });

    return composer;
  }

  static sceneTwo(botService: BotService): Composer<IBotContext> {
    const composer = new Composer<IBotContext>();
    composer.action("go_back_to_profile_scene", async (ctx) => {
      console.log("go_back_to_profile_scene");
      ctx.scene.leave();
      await clearMessages(ctx);
      return ctx.scene.enter(ProfileScene.sceneName);
    });
    composer.on("text", async (ctx) => {
      if (ctx.message.text.length < 10) {
        ctx.session.anyMessagesToDelete.push(
          await ctx.reply(
            "Номер карты или телефона должен быть длиннее 10 символов",
          ),
        );
        return;
      }
      botService.setPaymentContact(ctx.from.id, ctx.message.text);
      ctx.session.anyMessagesToDelete.push(
        await ctx.reply("Спасибо! Теперь вы можете продавать свои отчеты"),
      );
      ctx.scene.leave();
      await clearMessages(ctx);
      return ctx.scene.enter(ProfileScene.sceneName);
    });

    return composer;
  }
}
