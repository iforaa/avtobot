import { IBotContext } from "../context/context.interface";
import { BotService } from "../services/botservice";
import { Telegraf } from "telegraf";
import { Scenes } from "telegraf";
import { Scene } from "./scene.class";
import { Composer } from "telegraf";
import { InlineKeyboardButton } from "telegraf/typings/core/types/typegram";
import { emojiNumbers } from "../utils/emojiNumbers";

export class SearchCarsScene extends Scene {
  constructor(bot: Telegraf<IBotContext>, botService: BotService) {
    super(bot, botService, [SearchCarsScene.sceneOne(botService)]);
  }

  public static sceneName = "search_cars_scene";

  actions(): void {
    this.bot.action("enter_search_cars_scene", async (ctx) => {
      ctx.scene.leave();
      ctx.scene.enter("search_cars_scene");
    });

    this.bot.action(/select_model_(.+)/, async (ctx) => {
      const selectedModel = ctx.match[1]; // Extract the model from callback data
      const userId = ctx.from!.id;
      const vehicles = await this.botService.getVehiclesByUserId(userId);

      // Filter vehicles to get only those with the selected model
      const matchingVehicles = vehicles.filter(
        (vehicle) =>
          vehicle.model?.toLowerCase() === selectedModel.toLowerCase(),
      );

      // Create a message listing all vehicles with the selected model
      let message = `<b>Список авто для модели ${selectedModel}:</b>\n\n`;
      matchingVehicles.forEach((vehicle, index) => {
        message += `${emojiNumbers[index]} ${vehicle.mark} ${vehicle.model} (${vehicle.year})\n`;
      });

      // Add inline keyboard with number buttons for each vehicle, max 5 buttons per row
      const inlineKeyboard: InlineKeyboardButton[][] = [];
      for (let i = 0; i < matchingVehicles.length; i += 5) {
        const row = matchingVehicles.slice(i, i + 5).map((vehicle, index) => ({
          text: emojiNumbers[i + index], // Button with emoji number
          callback_data: `select_vehicle_${vehicle.id}`, // Callback for selecting this vehicle
        }));
        inlineKeyboard.push(row);
      }

      // Add a back button and optional main menu button below
      inlineKeyboard.push([
        {
          text: "Назад",
          callback_data: `select_mark_${matchingVehicles[0]?.mark}`,
        },
      ]);

      await ctx.replyOrEditMessage(message, {
        reply_markup: {
          inline_keyboard: inlineKeyboard,
        },
        parse_mode: "HTML",
      });
    });

    // Handle individual vehicle selection
    this.bot.action(/select_vehicle_(\d+)/, async (ctx) => {
      const vehicleId = parseInt(ctx.match[1]); // Extract vehicle ID from callback data
      ctx.session.currentVehicleID = vehicleId;
      ctx.scene.leave();
      return ctx.scene.enter("add_vehicle_scene");
    });

    this.bot.action(/select_mark_(.+)/, async (ctx) => {
      const selectedMark = ctx.match[1]; // Extract the mark from callback data
      const userId = ctx.from!.id;
      const vehicles = await this.botService.getVehiclesByUserId(userId);

      // Filter vehicles to get models associated with the selected mark
      const models = Array.from(
        new Set(
          vehicles
            .filter(
              (vehicle) =>
                vehicle.mark?.toLowerCase() === selectedMark.toLowerCase(),
            )
            .map((vehicle) => vehicle.model?.toLowerCase()),
        ),
      ).filter(Boolean);

      // Create a message listing all models with numbered emojis
      let message = `<b>Выберите модель для ${selectedMark}:</b>\n\n`;
      models.forEach((model, index) => {
        message += `${emojiNumbers[index]} ${model}\n`;
      });

      // Create an inline keyboard with buttons for each model, max 5 buttons per row
      const inlineKeyboard: InlineKeyboardButton[][] = [];
      for (let i = 0; i < models.length; i += 5) {
        const row = models.slice(i, i + 5).map((model, index) => ({
          text: emojiNumbers[i + index],
          callback_data: `select_model_${model}`,
        }));
        inlineKeyboard.push(row);
      }

      // Add a "back" button at the bottom to go back to mark selection
      inlineKeyboard.push([
        { text: "Назад", callback_data: "enter_search_cars_scene" },
      ]);

      await ctx.replyOrEditMessage(message, {
        reply_markup: {
          inline_keyboard: inlineKeyboard,
        },
        parse_mode: "HTML",
      });
    });
  }

  static sceneOne(botService: BotService): Composer<IBotContext> {
    return new Composer<IBotContext>().use(async (ctx) => {
      const userId = ctx.from!.id; // Access the user's Telegram ID
      const vehicles: any[] = await botService.getVehiclesByUserId(userId);

      const uniqueMarks = Array.from(
        new Set(vehicles.map((vehicle) => vehicle.mark?.toLowerCase())),
      ).filter(Boolean); // Filter out null or empty marks

      // Create a message listing all marks with numbered emojis
      let message = "<b>Выберите марку:</b>\n\n";
      uniqueMarks.forEach((mark, index) => {
        message += `${index + 1}) ${mark}\n`;
      });

      // Create an inline keyboard with buttons for each mark, max 5 buttons per row
      const inlineKeyboard: InlineKeyboardButton[][] = [];
      for (let i = 0; i < uniqueMarks.length; i += 5) {
        const row = uniqueMarks.slice(i, i + 5).map((mark, index) => ({
          text: emojiNumbers[i + index] || `${i + index + 1}`, // Fallback to a plain number if out of emoji range
          callback_data: `select_mark_${mark}`,
        }));
        inlineKeyboard.push(row);
      }
      console.log(inlineKeyboard);

      // Add a "back" button at the bottom
      inlineKeyboard.push([
        { text: "Назад", callback_data: "go_to_vehicles_scene" },
      ]);

      await ctx.reply(message, {
        reply_markup: {
          inline_keyboard: inlineKeyboard,
        },
        parse_mode: "HTML",
        // disable_web_page_preview: true,
      });

      ctx.scene.leave(); // Move to the next step if needed
    });
  }
}
