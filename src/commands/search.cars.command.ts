import { Telegraf } from "telegraf";
import { IBotContext } from "../context/context.interface";
import { BotService } from "../services/botservice";
import { Command } from "./command.class";
import { Scenes } from "telegraf";
import { InlineKeyboardButton } from "telegraf/typings/core/types/typegram";

export class SearchCarsCommand extends Command {
  constructor(bot: Telegraf<IBotContext>, botService: BotService) {
    super(bot, botService);
  }

  emojiNumbers = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

  handle(): void {
    this.bot.action("enter_search_cars_scene", async (ctx) => {
      ctx.scene.leave();
      ctx.scene.enter("search_cars_scene");
    });

    // Action handler for model selection
    // Action handler for model selection
    // Action handler for model selection
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
        message += `${this.emojiNumbers[index]} ${vehicle.mark} ${vehicle.model} (${vehicle.year})\n`;
      });

      // Add inline keyboard with number buttons for each vehicle, max 5 buttons per row
      const inlineKeyboard: InlineKeyboardButton[][] = [];
      for (let i = 0; i < matchingVehicles.length; i += 5) {
        const row = matchingVehicles.slice(i, i + 5).map((vehicle, index) => ({
          text: this.emojiNumbers[i + index], // Button with emoji number
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
        message += `${this.emojiNumbers[index]} ${model}\n`;
      });

      // Create an inline keyboard with buttons for each model, max 5 buttons per row
      const inlineKeyboard: InlineKeyboardButton[][] = [];
      for (let i = 0; i < models.length; i += 5) {
        const row = models.slice(i, i + 5).map((model, index) => ({
          text: this.emojiNumbers[i + index],
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

  scenes(): Scenes.WizardScene<IBotContext>[] {
    const searchCarsScene = new Scenes.WizardScene<IBotContext>(
      "search_cars_scene",
      async (ctx) => {
        const userId = ctx.from!.id; // Access the user's Telegram ID
        const vehicles: any[] =
          await this.botService.getVehiclesByUserId(userId);
        const uniqueMarks = Array.from(
          new Set(vehicles.map((vehicle) => vehicle.mark?.toLowerCase())),
        ).filter(Boolean); // Filter out null or empty marks

        // Create a message listing all marks with numbered emojis
        let message = "<b>Выберите марку:</b>\n\n";
        uniqueMarks.forEach((mark, index) => {
          message += `${this.emojiNumbers[index]} ${mark}\n`;
        });

        // Create an inline keyboard with buttons for each mark, max 5 buttons per row
        const inlineKeyboard: InlineKeyboardButton[][] = [];
        for (let i = 0; i < uniqueMarks.length; i += 5) {
          const row = uniqueMarks.slice(i, i + 5).map((mark, index) => ({
            text: this.emojiNumbers[i + index],
            callback_data: `select_mark_${mark}`,
          }));
          inlineKeyboard.push(row);
        }

        // Add a "back" button at the bottom
        inlineKeyboard.push([
          { text: "Назад", callback_data: "go_to_vehicles_scene" },
        ]);

        await ctx.replyOrEditMessage(message, {
          reply_markup: {
            inline_keyboard: inlineKeyboard,
          },
          parse_mode: "HTML",
          disable_web_page_preview: true,
        });

        ctx.scene.leave(); // Move to the next step if needed
      },
    );

    return [searchCarsScene];
  }
}
