import { Telegraf } from "telegraf";
import { IBotContext } from "../context/context.interface";
import { BotService } from "../services/botservice";

import { Scenes, Context, Composer } from "telegraf";
export abstract class Command {
  constructor(
    public bot: Telegraf<IBotContext>,
    public botService: BotService,
  ) {}

  abstract handle(): void;
  abstract scenes(): Scenes.WizardScene<IBotContext>[];
}
