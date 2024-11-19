import { IBotContext } from "../context/context.interface";
import { BotService } from "../services/botservice";
import { Telegraf } from "telegraf";
import { Scenes } from "telegraf";
import { Scene } from "./scene.class";
import { Composer } from "telegraf";
import { clearMessages } from "../utils/clearMessages";
import { CLOSE_MENU, ADD_CAR_MENU } from "../utils/menuKeyboard";
import { InlineKeyboardButton } from "telegraf/typings/core/types/typegram";

export class AddingReportScene extends Scene {
  constructor(bot: Telegraf<IBotContext>, botService: BotService) {
    super(bot, botService, [AddingReportScene.sceneOne(botService)]);
  }

  public static sceneName = "adding_report_scene";

  actions(): void {
    this.bot.action(/open_report_(\d+)/, async (ctx) => {
      const reportIndex = parseInt(ctx.match[1]) + 1; // Extract the vehicle index from callback data

      if (ctx.session.reports && reportIndex <= ctx.session.reports.length) {
        ctx.session.currentVehicleID = ctx.session.reports[reportIndex - 1].id; // Adjust for 0-based index
        console.log(`Opening vehicle ${reportIndex}`);
        ctx.scene.leave();
        return ctx.scene.enter("add_vehicle_scene");
      } else {
        await ctx.reply("Произошла ошибка: Отчет не найден.");
      }
    });
  }

  static sceneOne(botService: BotService): Composer<IBotContext> {
    const composer = new Composer<IBotContext>();
    composer.action("close_adding_vehicle_scene", async (ctx) => {
      try {
        await ctx.deleteMessage();
      } catch {}
      await clearMessages(ctx);
      ctx.scene.leave();
      return ctx.scene.enter("start_scene");
    });
    composer.hears(ADD_CAR_MENU, async (ctx) => {
      ctx.session.anyMessagesToDelete.push(
        await ctx.reply("Введи URL из объявления или VIN номер:", {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: CLOSE_MENU,
                  callback_data: "close_adding_vehicle_scene",
                },
              ],
            ],
          },
        }),
      );
    });

    composer.action("create_report_for_vehicle", async (ctx) => {
      const vehicleID = await botService.addVehicleByProvidedData(
        ctx.session.createVehicleIdentifier,
        ctx.session.createVehicleUserID,
      );

      await clearMessages(ctx);
      ctx.session.currentVehicleID = vehicleID;
      ctx.session.canBeEditedMessage = await ctx.reply("Загружаем...");
      ctx.scene.leave();
      return ctx.scene.enter("add_vehicle_scene");
    });

    composer.on("text", async (ctx) => {
      const inputText = ctx.message?.text;

      const userId = ctx.from?.id;
      // const userId = 1111;
      let vehicleID;

      try {
        await ctx.deleteMessage();
      } catch {}

      await clearMessages(ctx);

      const numberEmojis = [
        "1️⃣",
        "2️⃣",
        "3️⃣",
        "4️⃣",
        "5️⃣",
        "6️⃣",
        "7️⃣",
        "8️⃣",
        "9️⃣",
        "🔟",
      ];
      let reports;
      try {
        reports = await botService.getVehiclesByProvidedData(inputText);
        ctx.session.reports = reports;
      } catch {
        // ctx.scene.leave();
        return ctx.session.anyMessagesToDelete.push(
          ctx.reply(
            "Введён некорректный URL, VIN или номер кузова. Попробуй ещё раз.",
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: CLOSE_MENU,
                      callback_data: "close_adding_vehicle_scene",
                    },
                  ],
                ],
              },
            },
          ),
        );
        // return ctx.scene.enter("start_scene");
      }
      const reportsPageSize = 5; // Number of reports per page
      const reportsCurrentPage = ctx.session.reportsCurrentPage || 0; // Default to the first page
      if (!ctx.session.reportsCurrentPage) {
        ctx.session.reportsCurrentPage = 0;
      }

      const reportsTotalPages = Math.ceil(reports.length / reportsPageSize);
      ctx.session.createVehicleUserID = userId;
      ctx.session.createVehicleIdentifier = inputText;
      if (reports.length == 0) {
        const reportsMessage = "Отчета на это авто еще нету. Создаем?";
        const reportsInlineKeyboard = [
          [
            {
              text: "Да",
              callback_data: "create_report_for_vehicle",
            },
            {
              text: "Отмена",
              callback_data: "close_adding_vehicle_scene",
            },
          ],
        ];

        return ctx.session.anyMessagesToDelete.push(
          await ctx.reply(reportsMessage, {
            reply_markup: {
              inline_keyboard: reportsInlineKeyboard,
            },
            parse_mode: "HTML",
          }),
        );
      } else {
        let reportsMessage = "Отчеты для этого авто:\n\n";
        const reportsInlineKeyboard: InlineKeyboardButton[][] = [[]];

        // Get the reports for the current page
        const reportsStart = reportsCurrentPage * reportsPageSize;
        const reportsEnd = Math.min(
          reportsStart + reportsPageSize,
          reports.length,
        );
        const reportsOnPage = reports.slice(reportsStart, reportsEnd);

        reportsOnPage.forEach((report, index) => {
          const reportIndex = reportsStart + index; // Overall index of the report

          reportsMessage += `${numberEmojis[index] || index + 1} `;
          reportsMessage += `${report.username}`;
          if (report.user_id === userId) {
            reportsMessage += `  🔑 Ваш отчет\n`;
          } else {
            reportsMessage += `\n\n`;
          }

          if (
            reportsInlineKeyboard[reportsInlineKeyboard.length - 1].length === 5
          ) {
            reportsInlineKeyboard.push([]); // Start a new row
          }

          // Add a button for the current report
          reportsInlineKeyboard[reportsInlineKeyboard.length - 1].push({
            text: `-> ${numberEmojis[index] || index + 1}`,
            callback_data: `open_report_${reportIndex}`,
          });
        });

        // Add "Back 10" and "Next 10" buttons if applicable
        const reportsNavigationButtons: InlineKeyboardButton[] = [];
        if (reportsCurrentPage > 0) {
          reportsNavigationButtons.push({
            text: "⬅️ Назад",
            callback_data: "previous_reports_page",
          });
        }
        if (reportsCurrentPage < reportsTotalPages - 1) {
          reportsNavigationButtons.push({
            text: "➡️ Вперед",
            callback_data: "next_reports_page",
          });
        }

        if (reportsNavigationButtons.length > 0) {
          reportsInlineKeyboard.push(reportsNavigationButtons);
        }

        if (!reports.some((report) => report.user_id === userId)) {
          reportsInlineKeyboard.push([
            {
              text: "Добавить свой отчет",
              callback_data: "create_report_for_vehicle",
            },
          ]);
        }

        // Add a "Cancel" button
        reportsInlineKeyboard.push([
          {
            text: "Отмена",
            callback_data: "close_adding_vehicle_scene",
          },
        ]);
        ctx.session.previouseMessage = {
          reportsMessage,
          reportsInlineKeyboard,
        };

        return ctx.session.anyMessagesToDelete.push(
          await ctx.replyOrEditMessage(reportsMessage, {
            reply_markup: {
              inline_keyboard: reportsInlineKeyboard,
            },
            parse_mode: "HTML",
          }),
        );
      }

      // ctx.session.canBeEditedMessage = await ctx.reply("Загружаем...");
    });

    return composer;
  }
}
