import { Composer, Markup, Telegraf } from "telegraf";
import { Command } from "./command.class";
import { IBotContext } from "../context/context.interface";
import { BotService } from "../services/botservice";
import { WizardContext } from "telegraf/typings/scenes";
import { Scenes } from "telegraf";
import { cleanUrl } from "../utils/cleanurl";
import { InlineKeyboardButton } from "telegraf/typings/core/types/typegram";

export class StartCommand extends Command {
  constructor(bot: Telegraf<IBotContext>, botService: BotService) {
    super(bot, botService);
  }

  handle(): void {
    this.bot.start(async (ctx) => {
      console.log(ctx.session);

      ctx.reply(
        "Привет! Это специализированный маркетплейс для автоподборщиков. Мы закрытый клуб для своих, чтобы присоедениться, тебе нужно ввести пригласительный код:",
      );

      const userId = ctx.from?.id;
      const user = await this.botService.getUser(userId);

      if (user.length == 0) {
        this.botService.addUser(userId);
      }

      if (ctx.session.passedValidation == false) {
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

    this.bot.action("add_vehicle", async (ctx) => {});
    this.bot.action("my_vehicles", async (ctx) => {
      ctx.scene.leave();
      return ctx.scene.enter("my_vehicles_scene");
    });

    for (let i = 0; i < 10; i++) {
      this.bot.action(`open_vehicle_${i + 1}`, async (ctx) => {
        console.log(`Opening vehicle ${i + 1}`);
        ctx.session.currentVehicleUrl = ctx.session.vehicles[i].url;
        return ctx.scene.enter("add_vehicle_scene");
      });
    }
  }

  scenes(): Scenes.WizardScene<IBotContext>[] {
    const addVehicleHandler = new Composer<IBotContext>();
    const viewVehiclesHandler = new Composer<IBotContext>();

    viewVehiclesHandler.use(async (ctx) => {
      const userId = ctx.from!.id; // Access the user's Telegram ID
      const vehicles: any[] = await this.botService.getVehiclesByUserId(userId);
      ctx.session.vehicles = vehicles;
      if (vehicles.length > 0) {
        // Initialize an empty message string to collect all vehicle information
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
        // Loop through each vehicle and append its information to the message
        vehicles.forEach((vehicle, index) => {
          const vehicleUrl = vehicle.url;

          // Use emojis for numbering and append vehicle URL
          message += `${numberEmojis[index] || index + 1} ${vehicleUrl}\n\n`;

          if (inlineKeyboard[inlineKeyboard.length - 1].length === 5) {
            inlineKeyboard.push([]); // Start a new row
          }

          // Add a button for the current vehicle
          inlineKeyboard[inlineKeyboard.length - 1].push({
            text: `-> ${numberEmojis[index] || index + 1}`,
            callback_data: `open_vehicle_${index + 1}`,
          });
        });

        inlineKeyboard.push(
          [{ text: "Назад", callback_data: "go_to_start_scene" }], // "Back" button
        );
        // Send the combined message with information about all vehicles
        await ctx.reply(message, {
          reply_markup: {
            inline_keyboard: inlineKeyboard,
          },
        });
      } else {
        await ctx.reply("У вас нет зарегистрированных машин.", {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Назад", callback_data: "go_to_start_scene" }], // "Back" button for empty state as well
            ],
          },
        });
      }
      return ctx.scene.leave();
    });

    addVehicleHandler.action("add_vehicle", async (ctx) => {
      await ctx.reply("Введи URL из объявления:");

      addVehicleHandler.on("text", async (ctx) => {
        const vehicle = await this.botService.getVehicleByProvidedData(
          ctx.message?.text,
        );
        if (vehicle) {
          await ctx.reply("Авто уже есть в базе данных.");
          ctx.session.currentVehicleUrl = cleanUrl(ctx.message?.text);
        } else {
          const userId = ctx.from?.id;
          await this.botService.addVehicle(ctx.message?.text, userId);
          const vehicle = await this.botService.getVehicleByProvidedData(
            ctx.message?.text,
          );
          await ctx.reply("Новое авто добавлено!");
          ctx.session.currentVehicleUrl = cleanUrl(ctx.message?.text);
        }
        ctx.scene.leave();
        return ctx.scene.enter("add_vehicle_scene");
      });
      // ctx.wizard.next();
    });

    const startScene = new Scenes.WizardScene<IBotContext>(
      "start_scene",
      async (ctx) => {
        await ctx.reply("Главное Меню", {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Добавить авто", callback_data: "add_vehicle" }],
              [
                {
                  text: "Ранее добавленные авто",
                  callback_data: "my_vehicles",
                },
              ],
            ],
          },
        });
        ctx.wizard.next();
      },
      addVehicleHandler,
    );

    const viewVehiclesScene = new Scenes.WizardScene<IBotContext>(
      "my_vehicles_scene",
      viewVehiclesHandler,
    );

    return [startScene, viewVehiclesScene];
  }
}
