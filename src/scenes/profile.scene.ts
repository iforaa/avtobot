import { IBotContext } from "../context/context.interface";
import { BotService } from "../services/botservice";
import { Telegraf } from "telegraf";
import { Scenes } from "telegraf";
import { Scene } from "./scene.class";
import { Composer } from "telegraf";
import { ProfilePaymentScene } from "./profile.payment.scene";

export class ProfileScene extends Scene {
  constructor(bot: Telegraf<IBotContext>, botService: BotService) {
    super(bot, botService, [ProfileScene.sceneOne(botService)]);
  }

  public static sceneName = "profile_scene";

  actions(): void {
    this.bot.action("setup_payment_method", async (ctx) => {
      return ctx.scene.enter(ProfilePaymentScene.sceneName);
    });

    this.bot.action("generate_invite", async (ctx) => {
      ctx.session.anyMessagesToDelete.push(
        await ctx.reply(
          "Поделись этим пригласительным только с автоподборщиком",
        ),
      );
      ctx.session.anyMessagesToDelete.push(
        await ctx.reply(
          `${await this.botService.generateOrFetchInvite(ctx.from.id)}`,
        ),
      );
      return ctx.scene.leave();
    });
  }

  static sceneOne(botService: BotService): Composer<IBotContext> {
    return new Composer<IBotContext>().use(async (ctx) => {
      if (!ctx.from) {
        return;
      }
      let user: any = null;
      const users = await botService.getUser(ctx.from.id);
      if (users && users.length > 0) {
        user = users[0];
      } else {
        return;
      }
      let message = `Привет, ${ctx.from.first_name}!\n\n`;
      if (user.payment_contact && user.payment_contact.length > 0) {
        message += `Твой платежный контакт: ${user.payment_contact}\n\n`;
      } else {
        message += `Ты не указал платежный контакт\n\n`;
      }

      ctx.session.anyMessagesToDelete.push(
        await ctx.reply(message, {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "✉️ Сделать пригласительный",
                  callback_data: "generate_invite",
                },
              ],
              [
                {
                  text: "💳 Платежный метод",
                  callback_data: "setup_payment_method",
                },
              ],
            ],
          },
        }),
      );
      return ctx.scene.leave();
    });
  }
}
