import { Composer, Markup, Scenes, Telegraf } from "telegraf";
import { Command } from "./command.class";
import { IBotContext } from "../context/context.interface";
import { cleanUrl } from "../utils/cleanurl";
import { BotService } from "../services/botservice";
import { WizardContext } from "telegraf/typings/scenes";
import { MediaGroup } from "telegraf/typings/telegram-types";
import { constructLinkForVehicle } from "../utils/parseUrlDetails";
import { dateFormatter } from "../utils/dateFormatter";
import { InlineKeyboardButton } from "telegraf/typings/core/types/typegram";

export class EditContentCommand extends Command {
  constructor(bot: Telegraf<IBotContext>, botService: BotService) {
    super(bot, botService);
  }

  handle(): void {
    this.bot.action("edit_content", (ctx) =>
      ctx.scene.enter("edit_content_scene"),
    );
    this.bot.action("previous_content_page", async (ctx) => {
      await this.showPreviousPhoto(ctx);
    });
    this.bot.action("next_content_page", async (ctx) => {
      await this.showNextPhoto(ctx);
    });
    this.bot.action("delete_content", async (ctx) => {
      await this.deleteCurrentPhoto(ctx);
    });
  }

  scenes(): Scenes.WizardScene<IBotContext>[] {
    const editContentScene = new Scenes.WizardScene<IBotContext>(
      "edit_content_scene",
      async (ctx) => {
        ctx.session.currentPhotoIndex = 0; // Initialize current photo index
        await this.displayPhoto(ctx);
        return await ctx.scene.leave();
      },
    );

    return [editContentScene];
  }
  async displayPhoto(ctx: any) {
    const vehicleID = ctx.session.currentVehicleID;
    const content = await this.botService.getPhotosOfVehicle(vehicleID); // Returns both photos and videos

    if (content.length === 0) {
      await ctx.reply("Контент отсутствует.");
      return ctx.scene.leave();
    }

    const currentContent = content[ctx.session.currentPhotoIndex];
    let mediaUrl = currentContent.replace(
      /(photos|videos)\//,
      "https://avtopodborbot.igor-n-kuz8044.workers.dev/download/",
    );

    let captionText = `${ctx.session.currentPhotoIndex + 1} из ${content.length}`;

    if (currentContent.includes("photos/")) {
      // If it's a photo, append "/photo" and send as a photo message
      mediaUrl += "/photo";
      await ctx.replyOrEditPhoto(mediaUrl, captionText, {
        reply_markup: this.getInlineKeyboard(
          ctx.session.currentPhotoIndex,
          content.length,
        ),
      });
    } else if (currentContent.includes("videos/")) {
      // If it's a video, append "/video" and send as a link in a text message
      mediaUrl += "/video";
      const videoMessage = `<a href="${mediaUrl}">Смотреть видео</a>\n\n${captionText}`;

      await ctx.replyOrEditMessage(videoMessage, {
        parse_mode: "HTML",
        reply_markup: this.getInlineKeyboard(
          ctx.session.currentPhotoIndex,
          content.length,
        ),
      });
    } else {
      await ctx.replyOrEditMessage("Неверный формат контента.");
      return ctx.scene.leave();
    }
  }

  // Helper function to generate the inline keyboard
  getInlineKeyboard(currentIndex: number, totalCount: number) {
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === totalCount - 1;

    return {
      inline_keyboard: [
        [
          {
            text: isFirst ? "🔴" : "⬅️",
            callback_data: isFirst ? "disabled" : "previous_content_page",
          },
          { text: "🗑️ Удалить", callback_data: "delete_content" },
          {
            text: isLast ? "🔴" : "➡️",
            callback_data: isLast ? "disabled" : "next_content_page",
          },
        ],
        [{ text: "Назад", callback_data: "view_vehicle_photos" }],
      ],
    };
  }

  async showNextPhoto(ctx: any) {
    const photos = await this.botService.getPhotosOfVehicle(
      ctx.session.currentVehicleID,
    );
    if (ctx.session.currentPhotoIndex < photos.length - 1) {
      const currentContent = photos[ctx.session.currentPhotoIndex];
      const nextContent = photos[ctx.session.currentPhotoIndex + 1];

      const currentType = this.getContentType(currentContent);
      const nextType = this.getContentType(nextContent);

      // Increment the index only after determining the content type
      ctx.session.currentPhotoIndex++;

      if (currentType !== nextType) {
        // If the content type changes, delete the current message
        await ctx.deleteMessage(ctx.session.canBeEditedMessage?.message_id);
        ctx.session.canBeEditedMessage = null;
      }

      await this.displayPhoto(ctx);
    }
  }

  async showPreviousPhoto(ctx: any) {
    if (ctx.session.currentPhotoIndex > 0) {
      const photos = await this.botService.getPhotosOfVehicle(
        ctx.session.currentVehicleID,
      );
      const currentContent = photos[ctx.session.currentPhotoIndex];
      const previousContent = photos[ctx.session.currentPhotoIndex - 1];

      const currentType = this.getContentType(currentContent);
      const previousType = this.getContentType(previousContent);

      // Decrement the index only after determining the content type
      ctx.session.currentPhotoIndex--;

      if (currentType !== previousType) {
        // If the content type changes, delete the current message
        await ctx.deleteMessage(ctx.session.canBeEditedMessage?.message_id);
        ctx.session.canBeEditedMessage = null;
      }

      await this.displayPhoto(ctx);
    }
  }

  // Helper function to determine content type based on path
  getContentType(contentPath: string): "photo" | "video" {
    return contentPath.includes("photos/") ? "photo" : "video";
  }

  async deleteCurrentPhoto(ctx: any) {
    const photos = await this.botService.getPhotosOfVehicle(
      ctx.session.currentVehicleID,
    );
    const photoToDelete = photos[ctx.session.currentPhotoIndex];

    // Call the botService to delete the photo from your data source
    await this.botService.deletePhoto(
      ctx.session.currentVehicleID,
      photoToDelete,
    );

    // Remove the deleted photo from the local list and update the index
    ctx.session.currentPhotoIndex = Math.max(
      ctx.session.currentPhotoIndex - 1,
      0,
    );
    await ctx.reply("Удалено.");

    if (photos.length > 1) {
      await this.displayPhoto(ctx);
    } else {
      await ctx.reply("Больше нету.");
      ctx.scene.leave();
      return ctx.scene.enter("add_vehicle_scene");
    }
  }
}
