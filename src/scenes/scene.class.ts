import { Telegraf } from "telegraf";
import { IBotContext } from "../context/context.interface";
import { BotService } from "../services/botservice";

import { Scenes, Context, Composer } from "telegraf";
export abstract class Scene extends Scenes.WizardScene<IBotContext> {
  constructor(
    public bot: Telegraf<IBotContext>,
    public botService: BotService,
    public steps: Composer<IBotContext>[],
  ) {
    super((new.target as typeof Scene).sceneName, ...steps);
  }

  public static sceneName: string;
  abstract actions(): void;
}
