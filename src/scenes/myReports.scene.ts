import { IBotContext } from "../context/context.interface";
import { BotService } from "../services/botservice";
import { Telegraf } from "telegraf";
import { Scenes } from "telegraf";
import { Scene } from "./scene.class";
import { Composer } from "telegraf";
import { clearMessages } from "../utils/clearMessages";
import { CLOSE_MENU } from "../utils/menuKeyboard";
import { InlineKeyboardButton } from "telegraf/typings/core/types/typegram";
import { constructLinkForVehicle } from "../utils/parseUrlDetails";
import { dateFormatter } from "../utils/dateFormatter";

export class MyReportsScene extends Scene {
  constructor(bot: Telegraf<IBotContext>, botService: BotService) {
    super(bot, botService, [MyReportsScene.sceneOne(botService)]);
  }

  public static sceneName = "my_reports_scene";

  actions(): void {
    this.bot.action("previous_vehicles_page", async (ctx) => {
      if (ctx.session.currentPage > 0) {
        ctx.session.currentPage -= 1;
        await clearMessages(ctx);
        return ctx.scene.enter("my_reports_scene");
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
        await clearMessages(ctx);
        return ctx.scene.enter("my_reports_scene");
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
        await clearMessages(ctx);
        return ctx.scene.enter("add_vehicle_scene");
      } else {
        await ctx.reply("Произошла ошибка: Автомобиль не найден.");
      }
    });
  }

  static sceneOne(botService: BotService): Composer<IBotContext> {
    return new Composer<IBotContext>().use(async (ctx) => {
      const userId = ctx.from!.id; // Access the user's Telegram ID
      const vehicles: any[] = await botService.getVehiclesByUserId(userId);
      ctx.session.vehicles = vehicles;

      const pageSize = 5; // Number of vehicles per page
      const currentPage = ctx.session.currentPage || 0; // Default to the first page
      if (!ctx.session.currentPage) {
        ctx.session.currentPage = 0;
      }

      const totalPages = Math.ceil(vehicles.length / pageSize);

      if (vehicles.length > 0) {
        let message = `Всего отчетов: <strong>${vehicles.length}</strong>\n`;
        message += `Страница <strong>${currentPage + 1}</strong> из <strong>${totalPages}</strong>\n\n`;
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

        const keyboardOptions: Object = {
          reply_markup: {
            inline_keyboard: inlineKeyboard,
          },
          parse_mode: "HTML",
          disable_web_page_preview: true,
        };
        ctx.session.anyMessagesToDelete.push(
          await ctx.reply(message, keyboardOptions),
        );
      } else {
        // Handle the case when no vehicles are available
        ctx.session.anyMessagesToDelete.push(
          await ctx.reply("У вас нет зарегистрированных отчетов.", {
            reply_markup: {
              inline_keyboard: [
                [{ text: CLOSE_MENU, callback_data: "delete_vehicles_scene" }],
              ],
            },
          }),
        );
      }

      return ctx.scene.leave();
    });
  }
}
