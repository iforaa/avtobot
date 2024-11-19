import { Markup, Telegraf, Composer } from "telegraf";
import { Command } from "./command.class";
import { IBotContext } from "../context/context.interface";
import { BotService } from "../services/botservice";
import { WizardContext } from "telegraf/typings/scenes";
import { Scenes } from "telegraf";
import { cleanUrl } from "../utils/cleanurl";
import { InlineKeyboardButton } from "telegraf/typings/core/types/typegram";
import { constructLinkForVehicle } from "../utils/parseUrlDetails";
import { dateFormatter } from "../utils/dateFormatter";
import { clearMessages } from "../utils/clearMessages";
import { collapseTextChangeRangesAcrossMultipleVersions } from "typescript";
import { mainMenu } from "../utils/menuKeyboard";

import {
  ADD_CAR_MENU,
  ALL_CARS_MENU,
  PROFILE_MENU,
} from "../utils/menuKeyboard";

let CLOSE_MENU = "❎ Закрыть";

export class StartCommand extends Command {
  constructor(bot: Telegraf<IBotContext>, botService: BotService) {
    super(bot, botService);
  }

  handle(): void {}

  scenes(): Scenes.WizardScene<IBotContext>[] {
    return [];
  }
}
