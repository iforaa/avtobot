import { Composer, Markup, Scenes, Telegraf } from "telegraf";
import { Command } from "./command.class";
import { IBotContext } from "../context/context.interface";
import { cleanUrl } from "../utils/cleanurl";
import { BotService } from "../services/botservice";
import { WizardContext } from "telegraf/typings/scenes";
// import { downloadAndSaveFile } from "../utils/downloadAndSaveFile";
import { URL } from "url";
import { uploadUserPhotos } from "../utils/uploadUserPhotos";
import { MediaGroup } from "telegraf/typings/telegram-types";
import { PhotoSection } from "../utils/photoSection";
import { mainMenu } from "../utils/menuKeyboard";

export class AddPhotoCommand extends Command {
  constructor(bot: Telegraf<IBotContext>, botService: BotService) {
    super(bot, botService);
  }

  handle(): void {}

  scenes(): Scenes.WizardScene<IBotContext>[] {
    const addPhotoScene = new Scenes.WizardScene<IBotContext>(
      "add_photo_scene",
      async (ctx) => {},
      // addPhotoDescrHandler,
    );

    return [addPhotoScene];
  }

  // async clearMessages(ctx: any) {
  //   try {
  //     for (const group of ctx.session.mediaGroupsMessage) {
  //       for (const message of group) {
  //         try {
  //           await ctx.deleteMessage(message.message_id);
  //         } catch {}
  //       }
  //     }
  //     for (const message of ctx.session.anyMessagesToDelete) {
  //       try {
  //         await ctx.deleteMessage(message.message_id);
  //       } catch {}
  //     }
  //     ctx.session.anyMessagesToDelete = [];
  //   } catch {}
  // }
}
