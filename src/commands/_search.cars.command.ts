import { Telegraf } from "telegraf";
import { IBotContext } from "../context/context.interface";
import { BotService } from "../services/botservice";
import { Command } from "./command.class";
import { Scenes } from "telegraf";
import { InlineKeyboardButton } from "telegraf/typings/core/types/typegram";

export class SearchCarsCommand extends Command {
  constructor(bot: Telegraf<IBotContext>, botService: BotService) {
    super(bot, botService);
  }

  emojiNumbers = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

  handle(): void {}

  scenes(): Scenes.WizardScene<IBotContext>[] {
    const searchCarsScene = new Scenes.WizardScene<IBotContext>(
      "search_cars_scene",
      async (ctx) => {},
    );

    return [searchCarsScene];
  }
}
