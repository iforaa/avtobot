import { Telegraf } from "telegraf";
import { IBotContext } from "../context/context.interface";
import { BotService } from "../services/botservice";
import { Command } from "./command.class";
import { Scenes } from "telegraf";
import { InlineKeyboardButton } from "telegraf/typings/core/types/typegram";

export class ProfileCommand extends Command {
  constructor(bot: Telegraf<IBotContext>, botService: BotService) {
    super(bot, botService);
  }

  handle(): void {
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

  scenes(): Scenes.WizardScene<IBotContext>[] {
    const profileScene = new Scenes.WizardScene<IBotContext>(
      "profile_scene",
      async (ctx) => {
        ctx.session.anyMessagesToDelete.push(
          await ctx.reply(
            "Это твой профиль. Тут сейчас пустовато, но потом будет много чего",
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "✉️ Сгенерировать пригласительный",
                      callback_data: "generate_invite",
                    },
                  ],
                ],
              },
            },
          ),
        );

        return ctx.scene.leave();
      },
    );

    return [profileScene];
  }
}
