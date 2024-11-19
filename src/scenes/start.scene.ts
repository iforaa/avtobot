import { IBotContext } from "../context/context.interface";
import { BotService } from "../services/botservice";
import { Telegraf } from "telegraf";
import { Scenes } from "telegraf";
import { Scene } from "./scene.class";
import { Composer } from "telegraf";
import { clearMessages } from "../utils/clearMessages";
import {
  CLOSE_MENU,
  ADD_CAR_MENU,
  PROFILE_MENU,
  ALL_CARS_MENU,
} from "../utils/menuKeyboard";
import { mainMenu } from "../utils/menuKeyboard";

export class StartScene extends Scene {
  constructor(bot: Telegraf<IBotContext>, botService: BotService) {
    super(bot, botService, [StartScene.sceneOne()]);
  }

  public static sceneName = "start_scene";

  actions(): void {
    this.bot.start(async (ctx) => {
      ctx.session.canBeEditedMessage = null;
      ctx.session.anyMessagesToDelete = [];
      ctx.session.mediaGroupsMessage = [];
      ctx.session.vehicles = [];
      ctx.session.reports = [];
      ctx.session.reportsCurrentPage = 0;
      ctx.session.currentPage = 0;
      ctx.session.currentVehicle = 0;
      ctx.session.currentVehicleID = 0;
      ctx.session.currentPhotoIndex = 0;

      let userId = ctx.from?.id;
      const username = ctx.from?.username || "Unknown";
      const user = await this.botService.getUser(userId);
      console.log(user);
      if (user.length == 0) {
        ctx.session.anyMessagesToDelete.push(
          await ctx.reply(
            "Привет! Это маркетплейс для автоподборщиков. Мы закрытый клуб для своих, чтобы присоедениться, тебе нужно ввести 2 пригласительный кода. Введи их через пробел:",
          ),
        );
        this.bot.on("text", async (ctx) => {
          const codes = ctx.message.text.trim();
          if (codes.split(" ").length === 2) {
            const [code1, code2] = codes.split(" ");

            if (await this.botService.isRedeemable(codes)) {
              await this.botService.addUser(userId, username);
              const isRedeemed = await this.botService.redeemInvite(
                codes,
                userId,
              );

              ctx.session.anyMessagesToDelete.push(
                await ctx.reply("Добро пожаловать в клуб! 🎉"),
              );

              return ctx.scene.enter("start_scene");
            } else {
              ctx.session.anyMessagesToDelete.push(
                await ctx.reply(
                  "Один или оба кода неверны или уже использованы. Попробуй еще раз.",
                ),
              );
            }
          } else {
            ctx.session.anyMessagesToDelete.push(
              await ctx.reply("Введи два кода, разделенные пробелом."),
            );
          }
        });
      } else {
        return ctx.scene.enter("start_scene");
      }
    });

    this.bot.command("reset", async (ctx) => {
      return ctx.scene.enter("start_scene");
    });

    this.bot.hears(PROFILE_MENU, async (ctx) => {
      ctx.scene.leave();
      try {
        ctx.deleteMessage();
      } catch {}
      await clearMessages(ctx);
      return ctx.scene.enter("profile_scene");
    });

    this.bot.hears(ADD_CAR_MENU, async (ctx) => {
      ctx.scene.leave();
      try {
        ctx.deleteMessage();
      } catch {}
      await clearMessages(ctx);
      return ctx.scene.enter("adding_report_scene");
    });
    this.bot.hears(ALL_CARS_MENU, async (ctx) => {
      ctx.scene.leave();
      try {
        ctx.deleteMessage();
      } catch {}
      await clearMessages(ctx);
      return ctx.scene.enter("my_reports_scene");
    });
  }

  static sceneOne(): Composer<IBotContext> {
    return new Composer<IBotContext>().use(async (ctx) => {
      await mainMenu(ctx);
      ctx.scene.leave();
    });
  }
}
