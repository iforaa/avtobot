import { Telegraf, Scenes, Composer } from "telegraf";
import { Command } from "./src/commands/command.class";
import { IConfigService } from "./src/config/config.interface";
import { ConfigService } from "./src/config/config.service";
import { IBotContext } from "./src/context/context.interface";
// import { StartCommand } from "./src/commands/start.command";
import LocalSession from "telegraf-session-local";
// import { AddVehicleCommand } from "./src/commands/add.vehicles.command";

import { DBRepository } from "./src/repository/db.repository";
import { BotService } from "./src/services/botservice";
import { DbService } from "./src/services/db.service";
// import { AddPhotoCommand } from "./src/commands/add.photos.command";
import { DatastoreService } from "./src/services/datastore.service";
// import { EditContentCommand } from "./src/commands/edit.content.command";
// import { SearchCarsCommand } from "./src/commands/search.cars.command";
// import { ProfileCommand } from "./src/commands/profile.command";
import { ProfileScene } from "./src/scenes/profile.scene";
import { SearchCarsScene } from "./src/scenes/searchCars.scene";
import { Scene } from "./src/scenes/scene.class";
import { EditPhotosScene } from "./src/scenes/editPhotos.scene";
import { AddPhotoScene } from "./src/scenes/addPhoto.scene";
import { PhotosScene } from "./src/scenes/photos.scene";
import { AddVehicleScene } from "./src/scenes/addVehicle.scene";
import { EditVehicleMarkScene } from "./src/scenes/editVehicleMark.scene";
import { EditVehicleYearScene } from "./src/scenes/editVehicleYear.scene";
import { EditVehicleModelScene } from "./src/scenes/editVehicleModel.scene";
import { EditVehicleStarsScene } from "./src/scenes/editVehicleStars.scene";
import { EditVehicleUrlVinScene } from "./src/scenes/editVehicleUrlVin.scene";
import { EditVehicleRemoteReportScene } from "./src/scenes/editVehicleRemoteReport.scene";
import { EditVehicleMileageScene } from "./src/scenes/editVehicleMileage.scene";
import { EditVehicleDescScene } from "./src/scenes/editVehicleDesc.scene";
import { StartScene } from "./src/scenes/start.scene";
import { MyReportsScene } from "./src/scenes/myReports.scene";
import { AddingReportScene } from "./src/scenes/addingReport.scene";
import { ProfilePaymentScene } from "./src/scenes/profile.payment.scene";

class Bot {
  bot: Telegraf<IBotContext>;
  scenes: Scene[] = [];
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
                parse_mode: "HTML",
                ...keyboardOptions,
              },
            );
          }
        } else {
          ctx.session.canBeEditedMessage = await ctx.replyWithPhoto(photoUrl, {
            caption: caption,
            parse_mode: "HTML",
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
    this.scenes = [
      new StartScene(this.bot, this.botService),
      new MyReportsScene(this.bot, this.botService),
      new AddingReportScene(this.bot, this.botService),
      new ProfileScene(this.bot, this.botService),
      new SearchCarsScene(this.bot, this.botService),
      new EditPhotosScene(this.bot, this.botService),

      new PhotosScene(this.bot, this.botService),
      new AddPhotoScene(this.bot, this.botService),

      new AddVehicleScene(this.bot, this.botService),
      new EditVehicleDescScene(this.bot, this.botService),
      new EditVehicleMarkScene(this.bot, this.botService),
      new EditVehicleYearScene(this.bot, this.botService),
      new EditVehicleMileageScene(this.bot, this.botService),
      new EditVehicleModelScene(this.bot, this.botService),
      new EditVehicleStarsScene(this.bot, this.botService),
      new EditVehicleUrlVinScene(this.bot, this.botService),
      new EditVehicleRemoteReportScene(this.bot, this.botService),
      new ProfilePaymentScene(this.bot, this.botService),
    ];

    const stage = new Scenes.Stage<IBotContext>(this.scenes);
    this.bot.use(stage.middleware());

    for (const scene of this.scenes) {
      scene.actions();
    }

    this.bot.launch();
  }
}

const bot = new Bot(new ConfigService());
bot.init();
