import { Composer, Markup, Telegraf } from "telegraf";
import { Command } from "./command.class";
import { IBotContext } from "../context/context.interface";
import { BotService } from "../services/botservice";
import { WizardContext } from "telegraf/typings/scenes";
import { Scenes } from "telegraf";

export class StartCommand extends Command {
  constructor(bot: Telegraf<IBotContext>, botService: BotService) {
    super(bot, botService);
  }

  handle(): void {
    this.bot.start((ctx) => {
      console.log(ctx.session);
      ctx.reply(
        "Привет! Это специализированный маркетплейс для автоподборщиков. Мы закрытый клуб для своих, чтобы присоедениться, тебе нужно ввести пригласительный код:",
      );
      if (ctx.session.passedValidation == false) {
        this.bot.on("text", async (ctx) => {
          const inviteCode = ctx.message?.text;
          if (inviteCode === "123") {
            await ctx.reply("Верный код. Добро пожаловать!");
            ctx.session.passedValidation = true;
            await showMainMenu(ctx);
          } else {
            await ctx.reply("Неверный код. Попробуй еще раз.");
          }
        });
      } else {
        ctx.reply("Ты уже валидирован!");
        showMainMenu(ctx);
      }
    });

    this.bot.action("add_vehicle", async (ctx) => {
      await ctx.reply("Введи URL из объявления:");
      ctx.scene.enter("add_vehicle_scene");
    });

    async function showMainMenu(ctx: IBotContext) {
      await ctx.reply("Главное Меню", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "1. Добавить авто", callback_data: "add_vehicle" }],
            [
              {
                text: "2. Ранее добавленные авто",
                callback_data: "my_vehicles",
              },
            ],
          ],
        },
      });
    }
  }

  scenes(): Scenes.WizardScene<IBotContext>[] {
    return [];
  }
}
