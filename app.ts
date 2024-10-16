import { Telegraf } from "telegraf";
import { Command } from "./src/commands/command.class";
import { IConfigService } from "./src/config/config.interface";
import { ConfigService } from "./src/config/config.service";
import { IBotContext } from "./src/context/context.interface";
import { StartCommand } from "./src/commands/start.command";
import LocalSession from "telegraf-session-local";
import { AddVehicleCommand } from "./src/commands/add.vehicles.command";
import { DbService } from "./src/context/db.service";
import { DBRepository } from "./src/repository/db.repository";
import { BotService } from "./src/services/botservice";

class Bot {
  bot: Telegraf<IBotContext>;
  commands: Command[] = [];

  private botService: BotService;

  constructor(private readonly configService: IConfigService) {
    this.bot = new Telegraf<IBotContext>(this.configService.get("TOKEN"));
    this.bot.use(new LocalSession({ database: "sessions.json" }).middleware());

    this.botService = new BotService(
      new DBRepository(new DbService(this.configService.get("PG_ADDRESS"))),
    );
  }

  init() {
    this.commands = [
      new StartCommand(this.bot, this.botService),
      new AddVehicleCommand(this.bot, this.botService),
    ];
    for (const command of this.commands) {
      command.handle();
    }
    this.bot.launch();
  }
}

const bot = new Bot(new ConfigService());
bot.init();
