import { Telegraf } from "telegraf";
import { Command } from "./src/commands/command.class";
import { IConfigService } from "./src/config/config.interface";
import { ConfigService } from "./src/config/config.service";
import { IBotContext } from "./src/context/context.interface";
import { StartCommand } from "./src/commands/start.command";
import LocalSession from "telegraf-session-local";
import { AddVehicleCommand } from "./src/commands/add.vehicles.command";

class Bot {
  bot: Telegraf<IBotContext>;
  commands: Command[] = [];
  constructor(private readonly configService: IConfigService) {
    this.bot = new Telegraf<IBotContext>(this.configService.get("TOKEN"));
    this.bot.use(new LocalSession({ database: "sessions.json" }).middleware());
  }

  init() {
    this.commands = [
      new StartCommand(this.bot),
      new AddVehicleCommand(this.bot),
    ];
    for (const command of this.commands) {
      command.handle();
    }
    this.bot.launch();
  }
}

const bot = new Bot(new ConfigService());
bot.init();
