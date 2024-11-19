import { IBotContext } from "../context/context.interface";
import { BotService } from "../services/botservice";
import { Telegraf } from "telegraf";
import { Scenes } from "telegraf";
import { Scene } from "./scene.class";
import { Composer } from "telegraf";

type SimpleCallback = (ctx: any) => Promise<void>;

export class EditPhotosScene extends Scene {
  constructor(bot: Telegraf<IBotContext>, botService: BotService) {
    super(bot, botService, [
      EditPhotosScene.sceneOne(async (ctx: any) => {
        await this.displayPhoto(ctx);
      }),
    ]);
  }

  public static sceneName = "edit_photos_scene";

  actions(): void {
    this.bot.action("edit_content", (ctx) =>
      ctx.scene.enter("edit_photos_scene"),
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

    this.bot.action("mark_cover", async (ctx) => {
      const photos = await this.botService.getPhotosOfVehicle(
        ctx.session.currentVehicleID,
        ctx.session.photoSectionNumber,
      );
      const currentContent = photos[ctx.session.currentPhotoIndex];

      await this.botService.editVehicleCoverPhoto(
        ctx.session.currentVehicleID,
        currentContent.photo_id,
      );
      ctx.session.currentVehicle.cover_photo = currentContent.photo_id;
      await this.displayPhoto(ctx);
    });
  }

  static sceneOne(callback: SimpleCallback): Composer<IBotContext> {
    return new Composer<IBotContext>().use(async (ctx) => {
      ctx.session.currentPhotoIndex = 0; // Initialize current photo index
      callback(ctx);
      return await ctx.scene.leave();
    });
  }

  getInlineKeyboard(
    currentIndex: number,
    totalCount: number,
    markCoverButton = false,
  ) {
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
        markCoverButton
          ? [{ text: "Сделать обложкой", callback_data: "mark_cover" }]
          : [{ text: "🔴", callback_data: "mark_cover__" }],
        [{ text: "Назад", callback_data: "view_photos" }],
      ],
    };
  }

  async showNextPhoto(ctx: any) {
    const photos = (
      await this.botService.getPhotosOfVehicle(
        ctx.session.currentVehicleID,
        ctx.session.photoSectionNumber,
      )
    ).map((row: any) => row.photo_url);
    if (ctx.session.currentPhotoIndex < photos.length - 1) {
      const currentContent = photos[ctx.session.currentPhotoIndex];
      const nextContent = photos[ctx.session.currentPhotoIndex + 1];

      const currentType = this.getContentType(currentContent);
      const nextType = this.getContentType(nextContent);

      // Increment the index only after determining the content type
      ctx.session.currentPhotoIndex++;

      if (currentType !== nextType) {
        // If the content type changes, delete the current message
        try {
          await ctx.deleteMessage(ctx.session.canBeEditedMessage?.message_id);
        } catch {}
        ctx.session.canBeEditedMessage = null;
      }

      await this.displayPhoto(ctx);
    }
  }

  async displayPhoto(ctx: any) {
    const vehicleID = ctx.session.currentVehicleID;
    const content = await this.botService.getPhotosOfVehicle(
      vehicleID,
      ctx.session.photoSectionNumber,
    ); // Returns both photos and videos
    if (content.length === 0) {
      await ctx.reply("Контент отсутствует.");
      return ctx.scene.leave();
    }

    const currentContent = content[ctx.session.currentPhotoIndex];
    let mediaUrl = currentContent.photo_url.replace(
      /(photos|videos)\//,
      this.botService.datastoreURLFile(),
    );

    let captionText = `${ctx.session.currentPhotoIndex + 1} из ${content.length}`;

    if (currentContent.photo_url.includes("photos/")) {
      // If it's a photo, append "/photo" and send as a photo message
      mediaUrl += "/photo";
      await ctx.replyOrEditPhoto(mediaUrl, captionText, {
        reply_markup: this.getInlineKeyboard(
          ctx.session.currentPhotoIndex,
          content.length,
          ctx.session.currentVehicle.cover_photo == currentContent.photo_id
            ? false
            : true,
        ),
      });
    } else if (currentContent.photo_url.includes("videos/")) {
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

  async showPreviousPhoto(ctx: any) {
    if (ctx.session.currentPhotoIndex > 0) {
      const photos = (
        await this.botService.getPhotosOfVehicle(
          ctx.session.currentVehicleID,
          ctx.session.photoSectionNumber,
        )
      ).map((row: any) => row.photo_url);
      const currentContent = photos[ctx.session.currentPhotoIndex];
      const previousContent = photos[ctx.session.currentPhotoIndex - 1];

      const currentType = this.getContentType(currentContent);
      const previousType = this.getContentType(previousContent);

      // Decrement the index only after determining the content type
      ctx.session.currentPhotoIndex--;

      if (currentType !== previousType) {
        // If the content type changes, delete the current message
        try {
          await ctx.deleteMessage(ctx.session.canBeEditedMessage?.message_id);
        } catch {}
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
    const photos = (
      await this.botService.getPhotosOfVehicle(
        ctx.session.currentVehicleID,
        ctx.session.photoSectionNumber,
      )
    ).map((row: any) => row.photo_url);
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

    if (photos.length > 1) {
      await this.displayPhoto(ctx);
    } else {
      ctx.scene.leave();
      return ctx.scene.enter("photos_scene");
    }
  }
}
