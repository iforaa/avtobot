import { IBotContext } from "../context/context.interface";
import { BotService } from "../services/botservice";
import { Telegraf } from "telegraf";
import { Scenes } from "telegraf";
import { Scene } from "./scene.class";
import { Composer } from "telegraf";
import { constructLinkForVehicle } from "../utils/parseUrlDetails";
import { dateFormatter } from "../utils/dateFormatter";
import { InlineKeyboardButton } from "telegraf/typings/core/types/typegram";
import { PhotoSection } from "../utils/photoSection";
import { clearMessages } from "../utils/clearMessages";

export class AddVehicleScene extends Scene {
  constructor(bot: Telegraf<IBotContext>, botService: BotService) {
    super(bot, botService, [AddVehicleScene.sceneOne(botService)]);
  }

  public static sceneName = "add_vehicle_scene";

  actions(): void {
    this.bot.action("close_edit_scene", async (ctx) => {
      await clearMessages(ctx);
      ctx.scene.leave();
      ctx.scene.enter("add_vehicle_scene");
      ctx.wizard.cursor = 1;
    });

    this.bot.action("go_to_vehicles_scene", async (ctx) => {
      if (ctx.session.previouseMessage) {
        const { reportsMessage, reportsInlineKeyboard } =
          ctx.session.previouseMessage;
        ctx.session.previouseMessage = null;
        await clearMessages(ctx);
        await ctx.scene.enter("adding_report_scene");
        await ctx.replyOrEditMessage(reportsMessage, {
          reply_markup: {
            inline_keyboard: reportsInlineKeyboard,
          },
          parse_mode: "HTML",
        });
      } else {
        await clearMessages(ctx);
        ctx.scene.enter("my_reports_scene");
      }
    });
    this.bot.action("edit_content", async (ctx) => {
      await clearMessages(ctx);

      ctx.scene.enter("edit_photos_scene");
    });
  }

  static sceneOne(botService: BotService): Composer<IBotContext> {
    return new Composer<IBotContext>(async (ctx) => {
      // const loadingMessage = await ctx.reply("Загружаем авто");

      const vehicle = await botService.getVehicleById(
        ctx.session.currentVehicleID,
      );
      ctx.session.currentVehicle = vehicle;

      const vehicleDesc = vehicle.description;
      let message = constructLinkForVehicle(vehicle);
      message += ` \nДобавлено: <i>${dateFormatter(vehicle.created_at)}</i>\n\n`;
      message += `Марка: ${vehicle.mark || "Н/Д"}`;
      message += `\nМодель: ${vehicle.model || "Н/Д"}`;
      message += `\nПробег: ${vehicle.mileage || "Н/Д"}`;
      message += `\nГод: ${vehicle.year || "Н/Д"}`;

      const maxStars = 7;
      const filledStar = "⭐";
      const emptyStar = "☆";

      const stars = vehicle.stars ?? "Н/Д";
      const starDisplay =
        typeof stars === "number"
          ? filledStar.repeat(stars) + emptyStar.repeat(maxStars - stars)
          : stars;

      message += `\nБалл: ${starDisplay}`;
      if (vehicleDesc) {
        message += `\n\nОписание:\n${vehicleDesc}\n\n`;
      } else {
        message += "\n\nОписание отсутствует.\n\n";
      }

      if (vehicle.remote_report_link) {
        message += `Отчет: \n${vehicle.remote_report_link}\n\n`;
      }

      const inlineKeyboard: InlineKeyboardButton[][] = [[]];

      inlineKeyboard.push([
        {
          text: "📷 Фото/Видео",
          // callback_data: "attach_photos",
          callback_data: "view_photos",
        },
      ]);

      if (ctx.from?.id === vehicle.user_id) {
        inlineKeyboard.push([
          { text: "🛠️ Описание", callback_data: "edit_info" },
          {
            text: "🆔 URL/VIN",
            callback_data: "setup_url_vin",
          },
        ]);

        inlineKeyboard.push([
          { text: "🚗 Марка", callback_data: "edit_mark" },
          {
            text: "🚘 Модель",
            callback_data: "edit_model",
          },
        ]);

        inlineKeyboard.push([
          { text: "📅 Год", callback_data: "edit_year" },
          {
            text: "🧭 Пробег",
            callback_data: "edit_mileage",
          },
        ]);

        inlineKeyboard.push([
          {
            text: "📝 Внешний отчет",
            callback_data: "attach_remote_report",
          },
        ]);

        inlineKeyboard.push([
          {
            text: "⭐ Баллы",
            callback_data: "edit_stars",
          },
        ]);
      }

      inlineKeyboard.push([
        { text: "↩️ Назад", callback_data: "go_to_vehicles_scene" },
      ]);

      const allPhotos = (
        await botService.getPhotosOfVehicle(vehicle.id, PhotoSection.Kuzov)
      ).filter((photo) => photo.photo_url.includes("photos/"));

      if (allPhotos.length > 0) {
        let photoURL: string;

        if (vehicle && vehicle.cover_photo > 0) {
          const coverPhoto = await botService.getPhotoByID(vehicle.cover_photo);
          console.log("coverPhoto", coverPhoto);
          photoURL =
            coverPhoto && coverPhoto.length > 0
              ? coverPhoto[0].photo_url
              : allPhotos[0].photo_url;
          console.log("photoURL", photoURL);
        } else {
          photoURL = allPhotos[0].photo_url;
        }

        photoURL =
          photoURL.replace("photos/", botService.datastoreURLFile()) + "/photo";
        ctx.session.anyMessagesToDelete.push(await ctx.sendPhoto(photoURL));
      }

      ctx.session.anyMessagesToDelete.push(
        await ctx.reply(message, {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: inlineKeyboard, // Your inline keyboard
          },
        }),
      );

      ctx.scene.leave();
    });
  }
}
