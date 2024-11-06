import { Composer, Markup, Telegraf } from "telegraf";
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

  handle(): void {
    this.bot.start(async (ctx) => {
      ctx.session.canBeEditedMessage = null;
      ctx.session.anyMessagesToDelete = [];
      ctx.session.mediaGroupsMessage;
      ctx.session.vehicles = [];
      ctx.session.reports = [];
      ctx.session.reportsCurrentPage = 0;
      ctx.session.currentPage = 0;
      ctx.session.currentVehicle = 0;
      ctx.session.currentVehicleID = 0;
      ctx.session.currentPhotoIndex = 0;

      let userId = ctx.from?.id;
      userId = 0;
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
      return ctx.scene.enter("adding_car_scene");
    });
    this.bot.hears(ALL_CARS_MENU, async (ctx) => {
      ctx.scene.leave();
      try {
        ctx.deleteMessage();
      } catch {}
      await clearMessages(ctx);
      return ctx.scene.enter("my_vehicles_scene");
    });
    // this.bot.action("my_vehicles", async (ctx) => {
    //   ctx.scene.leave();
    //   return ctx.scene.enter("my_vehicles_scene");
    // });

    this.bot.action("previous_vehicles_page", async (ctx) => {
      if (ctx.session.currentPage > 0) {
        ctx.session.currentPage -= 1;
        return ctx.scene.enter("my_vehicles_scene");
      }
    });

    this.bot.action("search_cars", async (ctx) => {
      ctx.scene.leave();
      return ctx.scene.enter("search_cars_scene");
    });

    this.bot.action("next_vehicles_page", async (ctx) => {
      const totalPages = Math.ceil(ctx.session.vehicles.length / 5); // 10 vehicles per page
      if (ctx.session.currentPage < totalPages - 1) {
        ctx.session.currentPage += 1;
        return ctx.scene.enter("my_vehicles_scene");
      }
    });

    this.bot.action("delete_vehicles_scene", async (ctx) => {
      try {
        ctx.deleteMessage();
      } catch {}
    });

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

    this.bot.action(/open_vehicle_(\d+)/, async (ctx) => {
      const vehicleIndex = parseInt(ctx.match[1]) + 1; // Extract the vehicle index from callback data

      if (ctx.session.vehicles && vehicleIndex <= ctx.session.vehicles.length) {
        ctx.session.currentVehicleID =
          ctx.session.vehicles[vehicleIndex - 1].id; // Adjust for 0-based index
        console.log(`Opening vehicle ${vehicleIndex}`);
        return ctx.scene.enter("add_vehicle_scene");
      } else {
        await ctx.reply("Произошла ошибка: Автомобиль не найден.");
      }
    });
  }

  scenes(): Scenes.WizardScene<IBotContext>[] {
    const addVehicleHandler = new Composer<IBotContext>();
    addVehicleHandler.action("close_adding_vehicle_scene", async (ctx) => {
      try {
        await ctx.deleteMessage();
      } catch {}
      await clearMessages(ctx);
      ctx.scene.leave();
      return ctx.scene.enter("start_scene");
    });
    addVehicleHandler.hears(ADD_CAR_MENU, async (ctx) => {
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

      addVehicleHandler.action("create_report_for_vehicle", async (ctx) => {
        const vehicleID = await this.botService.addVehicleByProvidedData(
          ctx.session.createVehicleIdentifier,
          ctx.session.createVehicleUserID,
        );

        await clearMessages(ctx);
        ctx.session.currentVehicleID = vehicleID;
        ctx.session.canBeEditedMessage = await ctx.reply("Загружаем...");
        ctx.scene.leave();
        return ctx.scene.enter("add_vehicle_scene");
      });

      addVehicleHandler.on("text", async (ctx) => {
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

        try {
          const reports =
            await this.botService.getVehiclesByProvidedData(inputText);
          ctx.session.reports = reports;

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
                reportsInlineKeyboard[reportsInlineKeyboard.length - 1]
                  .length === 5
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
        } catch {
          return ctx.session.anyMessagesToDelete.push(
            ctx.reply(
              "Введён некорректный URL, VIN или номер кузова. Попробуй ещё раз.",
            ),
          );
        }

        // ctx.session.canBeEditedMessage = await ctx.reply("Загружаем...");
        // ctx.scene.leave();
        // return ctx.scene.enter("add_vehicle_scene");
      });
    });

    const addingCarScene = new Scenes.WizardScene<IBotContext>(
      "adding_car_scene",
      addVehicleHandler,
    );

    const startScene = new Scenes.WizardScene<IBotContext>(
      "start_scene",
      async (ctx) => {
        await mainMenu(ctx);
        ctx.scene.leave();
      },
    );

    const viewVehiclesHandler = new Composer<IBotContext>();
    // viewVehiclesHandler.hears(CLOSE_MENU, async (ctx) => {});

    viewVehiclesHandler.use(async (ctx) => {
      const userId = ctx.from!.id; // Access the user's Telegram ID
      const vehicles: any[] = await this.botService.getVehiclesByUserId(userId);
      ctx.session.vehicles = vehicles;

      const pageSize = 5; // Number of vehicles per page
      const currentPage = ctx.session.currentPage || 0; // Default to the first page
      if (!ctx.session.currentPage) {
        ctx.session.currentPage = 0;
      }

      const totalPages = Math.ceil(vehicles.length / pageSize);

      if (vehicles.length > 0) {
        let message = "Информация о ваших отчетах:\n\n";
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
        const inlineKeyboard: InlineKeyboardButton[][] = [[]];

        // Get the vehicles for the current page
        const start = currentPage * pageSize;
        const end = Math.min(start + pageSize, vehicles.length);
        const vehiclesOnPage = vehicles.slice(start, end);

        vehiclesOnPage.forEach((vehicle, index) => {
          const vehicleUrl = vehicle.url;
          const vehicleIndex = start + index; // Overall index of the vehicle

          message += `${numberEmojis[index] || index + 1} `;
          message += constructLinkForVehicle(vehicle);
          message += `  <i>[${dateFormatter(vehicle.created_at)}]</i>\n\n`;

          if (inlineKeyboard[inlineKeyboard.length - 1].length === 5) {
            inlineKeyboard.push([]); // Start a new row
          }

          // Add a button for the current vehicle
          inlineKeyboard[inlineKeyboard.length - 1].push({
            text: `-> ${numberEmojis[index] || index + 1}`,
            callback_data: `open_vehicle_${vehicleIndex}`,
          });
        });

        // Add "Back 10" and "Next 10" buttons if applicable
        const navigationButtons: InlineKeyboardButton[] = [];
        if (currentPage > 0) {
          navigationButtons.push({
            text: "⬅️ Назад",
            callback_data: "previous_vehicles_page",
          });
        }
        if (currentPage < totalPages - 1) {
          navigationButtons.push({
            text: "➡️ Вперед",
            callback_data: "next_vehicles_page",
          });
        }

        if (navigationButtons.length > 0) {
          inlineKeyboard.push(navigationButtons);
        }

        inlineKeyboard.push([
          {
            text: "🔍 Поиск по моделям",
            callback_data: "search_cars",
          },
        ]);

        // Add a "Back" button to go back to the start scene
        inlineKeyboard.push([
          { text: CLOSE_MENU, callback_data: "delete_vehicles_scene" },
        ]);

        // Send or edit the message with vehicle information

        await ctx.replyOrEditMessage(message, {
          reply_markup: {
            inline_keyboard: inlineKeyboard,
          },
          parse_mode: "HTML",
          disable_web_page_preview: true,
        });
      } else {
        // Handle the case when no vehicles are available
        await ctx.reply("У вас нет зарегистрированных машин.", {
          reply_markup: {
            inline_keyboard: [
              [{ text: CLOSE_MENU, callback_data: "delete_vehicles_scene" }],
            ],
          },
        });
      }

      return ctx.scene.leave();
    });

    // Creating the WizardScene and adding handlers
    const viewVehiclesScene = new Scenes.WizardScene<IBotContext>(
      "my_vehicles_scene",
      viewVehiclesHandler,
    );

    return [startScene, viewVehiclesScene, addingCarScene];
  }
}
