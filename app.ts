import { Telegraf, Scenes, Composer } from "telegraf";
import { Command } from "./src/commands/command.class";
import { IConfigService } from "./src/config/config.interface";
import { ConfigService } from "./src/config/config.service";
import { IBotContext } from "./src/context/context.interface";
import { StartCommand } from "./src/commands/start.command";
import LocalSession from "telegraf-session-local";
import { AddVehicleCommand } from "./src/commands/add.vehicles.command";

import { DBRepository } from "./src/repository/db.repository";
import { BotService } from "./src/services/botservice";
import { DbService } from "./src/services/db.service";
import { AddPhotoCommand } from "./src/commands/add.photos.command";
import { DatastoreService } from "./src/services/datastore.service";
import { EditContentCommand } from "./src/commands/edit.content.command";
import { SearchCarsCommand } from "./src/commands/search.cars.command";

class Bot {
  bot: Telegraf<IBotContext>;
  commands: Command[] = [];
  private botService: BotService;

  constructor(private readonly configService: IConfigService) {
    this.bot = new Telegraf<IBotContext>(this.configService.get("TOKEN"), {
      telegram: {
        apiRoot: "http://localhost:8081",
      },
    });
    this.bot.use(new LocalSession({ database: "sessions.json" }).middleware());
    this.bot.use(async (ctx, next) => {
      ctx.replyOrEditMessage = async (
        text: string,
        keyboardOptions: object,
      ) => {
        if (
          ctx.session.canBeEditedMessage !== null &&
          ctx.session.canBeEditedMessage !== undefined
        ) {
          try {
            ctx.session.canBeEditedMessage = await ctx.telegram.editMessageText(
              ctx.session.canBeEditedMessage.chat.id,
              ctx.session.canBeEditedMessage.message_id,
              undefined,
              text,
              keyboardOptions,
            );
          } catch (error) {
            console.log(error);
            ctx.session.canBeEditedMessage = await ctx.reply(
              text,
              keyboardOptions,
            );
          }
        } else {
          ctx.session.canBeEditedMessage = await ctx.reply(
            text,
            keyboardOptions,
          );
        }
        return;
      };

      ctx.replyOrEditPhoto = async (
        photoUrl: string,
        caption: string,
        keyboardOptions: object,
      ) => {
        if (
          ctx.session.canBeEditedMessage !== null &&
          ctx.session.canBeEditedMessage !== undefined
        ) {
          try {
            ctx.session.canBeEditedMessage =
              await ctx.telegram.editMessageMedia(
                ctx.session.canBeEditedMessage.chat.id,
                ctx.session.canBeEditedMessage.message_id,
                undefined,
                {
                  type: "photo",
                  media: photoUrl,
                  caption: caption,
                },
                keyboardOptions,
              );
          } catch (error) {
            console.log(error);
            ctx.session.canBeEditedMessage = await ctx.replyWithPhoto(
              photoUrl,
              {
                caption: caption,
                ...keyboardOptions,
              },
            );
          }
        } else {
          ctx.session.canBeEditedMessage = await ctx.replyWithPhoto(photoUrl, {
            caption: caption,
            ...keyboardOptions,
          });
        }
        return;
      };

      return next();
    });

    this.botService = new BotService(
      new DBRepository(new DbService(this.configService.get("PG_ADDRESS"))),
      new DatastoreService(this.configService.get("DATASTORE_URL")),
    );
  }

  init() {
    this.commands = [
      new StartCommand(this.bot, this.botService),
      new AddVehicleCommand(this.bot, this.botService),
      new AddPhotoCommand(this.bot, this.botService),
      new EditContentCommand(this.bot, this.botService),
      new SearchCarsCommand(this.bot, this.botService),
    ];

    const scenes: Scenes.WizardScene<IBotContext>[] = [];
    for (const command of this.commands) {
      scenes.push(...command.scenes());
    }
    const stage = new Scenes.Stage<IBotContext>(scenes);
    this.bot.use(stage.middleware());

    for (const command of this.commands) {
      command.handle();
    }

    this.bot.launch();
  }
}

const bot = new Bot(new ConfigService());
bot.init();
