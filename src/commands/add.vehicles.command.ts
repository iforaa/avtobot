import { Markup, Telegraf } from "telegraf";
import { Command } from "./command.class";
import { IBotContext } from "../context/context.interface";
import { cleanUrl } from "../utils/cleanurl";

export class AddVehicleCommand extends Command {
  constructor(bot: Telegraf<IBotContext>) {
    super(bot);
  }

  handle(): void {
    this.bot.action("add_vehicle", async (ctx) => {
      console.log(ctx.session);
      await ctx.reply("Введи URL из объявления:");

      this.bot.on("text", async (ctx) => {
        const url = cleanUrl(ctx.message?.text);
        if (ctx.session.vehicleDatabase[url]) {
          await ctx.reply("Авто уже есть в базе данных.");
          ctx.session.vehicleUrl = url;
          await showVehicleOptions(ctx);
        } else {
          ctx.session.vehicleDatabase[url] = url; // Adding to mock DB
          ctx.session.vehicleUrl = url;
          await ctx.reply("Новое авто добавлено!");

          await showVehicleOptions(ctx);
        }
      });
    });

    async function showVehicleOptions(ctx: IBotContext) {
      const vehicleUrl = ctx.session.vehicleUrl;

      if (!vehicleUrl) {
        await ctx.reply("Пожалуйста, выберите авто.");
        return;
      }

      // Retrieve the vehicle information from the database
      const vehicleData = ctx.session.vehicleDatabase[vehicleUrl];

      // Prepare the message with the description and photo count
      let message = `Информация о машине по ссылке: ${vehicleUrl}\n\n`;

      if (vehicleData && vehicleData.includes("Description:")) {
        const description = vehicleData.match(/Description: .*/g);
        if (description) {
          message += `Описание:\n${description[0].replace("Description: ", "")}\n\n`;
        }
      } else {
        message += "Описание отсутствует.\n\n";
      }

      const photoLinks = vehicleData ? vehicleData.match(/Photo: .*/g) : [];
      const photoCount = photoLinks ? photoLinks.length : 0;

      message += `Загружено фото: ${photoCount}\n`;

      await ctx.reply(message, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Прикрепить фото", callback_data: "attach_photos" }],
            [{ text: "Прикрепить видео", callback_data: "attach_video" }],
            [{ text: "Добавить описание", callback_data: "edit_info" }],
            [
              {
                text: "Просмотреть Фото",
                callback_data: "view_vehicle_photos",
              },
            ], // View photos button
          ],
        },
      });
    }
  }
}
