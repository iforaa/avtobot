import { Composer, Markup, Scenes, Telegraf } from "telegraf";
import { Command } from "./command.class";
import { IBotContext } from "../context/context.interface";
import { cleanUrl } from "../utils/cleanurl";
import { BotService } from "../services/botservice";
import { WizardContext } from "telegraf/typings/scenes";
import { MediaGroup } from "telegraf/typings/telegram-types";
import { constructLinkForVehicle } from "../utils/parseUrlDetails";
import { dateFormatter } from "../utils/dateFormatter";
import { clearMessages } from "../utils/clearMessages";
import { InlineKeyboardButton } from "telegraf/typings/core/types/typegram";
import { PhotoSection } from "../utils/photoSection";

export class AddVehicleCommand extends Command {
  constructor(bot: Telegraf<IBotContext>, botService: BotService) {
    super(bot, botService);
  }

  handle(): void {}

  scenes(): Scenes.WizardScene<IBotContext>[] {
    return [];
  }
}
