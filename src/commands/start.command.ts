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

export let ADD_CAR_MENU = "➕ Занести авто";
export let ALL_CARS_MENU = "🚗 Мои авто";

let CLOSE_MENU = "❎ Закрыть";

export class StartCommand extends Command {
  constructor(bot: Telegraf<IBotContext>, botService: BotService) {
    super(bot, botService);
  }

  handle(): void {
    this.bot.start(async (ctx) => {
      console.log(ctx.session);
      ctx.session.canBeEditedMessage = null;
      ctx.reply(
        "Привет! Это специализированный маркетплейс для автоподборщиков. Мы закрытый клуб для своих, чтобы присоедениться, тебе нужно ввести пригласительный код:",
      );

      const userId = ctx.from?.id;
      const user = await this.botService.getUser(userId);
      console.log(user);
      if (user.length == 0) {
        this.botService.addUser(userId);
      }

      if (ctx.session.passedValidation === false) {
        this.bot.on("text", async (ctx) => {
          const inviteCode = ctx.message?.text;
          if (inviteCode === "123") {
            await ctx.reply("Верный код. Добро пожаловать!");
            ctx.session.passedValidation = true;
            return ctx.scene.enter("start_scene");
          } else {
            await ctx.reply("Неверный код. Попробуй еще раз.");
          }
        });
      } else {
        await ctx.reply("Ты уже валидирован!");
        return ctx.scene.enter("start_scene");
      }
    });

    this.bot.command("reset", async (ctx) => {
      return ctx.scene.enter("start_scene");
    });

    this.bot.hears(ADD_CAR_MENU, async (ctx) => {
      ctx.scene.leave();
      try {
        ctx.deleteMessage();
      } catch {}
      return ctx.scene.enter("adding_car_scene");
    });
    this.bot.hears(ALL_CARS_MENU, async (ctx) => {
      ctx.scene.leave();
      try {
        ctx.deleteMessage();
      } catch {}
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
        ctx.deleteMessage();
      } catch {}
      ctx.scene.leave();
      return ctx.scene.enter("start_scene");
    });
    addVehicleHandler.hears(ADD_CAR_MENU, async (ctx) => {
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
      });

      addVehicleHandler.on("text", async (ctx) => {
        const inputText = ctx.message?.text;

        const userId = ctx.from?.id;
        let vehicleID;

        try {
          const vehicle =
            await this.botService.getVehicleByProvidedData(inputText);

          if (!vehicle) {
            await ctx.reply("Новое авто добавлено!");
            vehicleID = await this.botService.addVehicleByProvidedData(
              inputText,
              userId,
            );
          } else {
            await ctx.reply("Авто уже есть в базе данных.");
            vehicleID = vehicle.id;
          }

          ctx.session.currentVehicleID = vehicleID;
        } catch {
          return await ctx.reply(
            "Введён некорректный URL, VIN или номер кузова. Попробуй ещё раз.",
          );
        }

        ctx.session.canBeEditedMessage = await ctx.reply("Загружаем...");
        ctx.scene.leave();
        return ctx.scene.enter("add_vehicle_scene");
      });
    });

    const addingCarScene = new Scenes.WizardScene<IBotContext>(
      "adding_car_scene",
      addVehicleHandler,
    );

    const startScene = new Scenes.WizardScene<IBotContext>(
      "start_scene",
      async (ctx) => {
        await ctx.replyOrEditMessage("Главное Меню", {
          reply_markup: {
            keyboard: [
              [
                {
                  text: ALL_CARS_MENU,
                },
                { text: ADD_CAR_MENU },
              ],
            ],
            resize_keyboard: true,
          },
        });
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
        let message = "Информация о ваших машинах:\n\n";
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
