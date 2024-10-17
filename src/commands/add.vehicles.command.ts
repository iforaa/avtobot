import { Composer, Markup, Scenes, Telegraf } from "telegraf";
import { Command } from "./command.class";
import { IBotContext } from "../context/context.interface";
import { cleanUrl } from "../utils/cleanurl";
import { BotService } from "../services/botservice";
import { WizardContext } from "telegraf/typings/scenes";

export class AddVehicleCommand extends Command {
  constructor(bot: Telegraf<IBotContext>, botService: BotService) {
    super(bot, botService);
  }

  handle(): void {
    // const stage = new Scenes.Stage<IBotContext>([
    //   addVehicleScene,
    //   editDescScene,
    // ]);
    // this.bot.use(stage.middleware());

    this.bot.action("edit_info", (ctx) => ctx.scene.enter("edit_descr_scene"));
  }

  scenes(): Scenes.WizardScene<IBotContext>[] {
    const addVehicleHandler = new Composer<IBotContext>();
    const editDescrHandler = new Composer<IBotContext>();

    addVehicleHandler.on("text", async (ctx) => {
      const vehicle = await this.botService.getVehicleByProvidedData(
        ctx.message?.text,
      );
      if (vehicle) {
        await ctx.reply("Авто уже есть в базе данных.");
        ctx.session.currentVehicleUrl = cleanUrl(ctx.message?.text);
        await this.showVehicleOptions(ctx, vehicle);
      } else {
        await this.botService.addVehicle(ctx.message?.text);
        const vehicle = await this.botService.getVehicleByProvidedData(
          ctx.message?.text,
        );
        await ctx.reply("Новое авто добавлено!");
        ctx.session.currentVehicleUrl = cleanUrl(ctx.message?.text);
        await this.showVehicleOptions(ctx, vehicle);
      }
      return ctx.scene.leave();
    });

    const addVehicleScene = new Scenes.WizardScene<IBotContext>(
      "add_vehicle_scene",
      addVehicleHandler,
    );

    editDescrHandler.on("text", async (ctx) => {
      const description = ctx.message.text;
      const currentVehicleUrl = ctx.session.currentVehicleUrl;
      this.botService.addDescriptionToVehicle(
        description || "",
        currentVehicleUrl,
      );

      await ctx.reply("Описание добавлено успешно!");

      const vehicle =
        await this.botService.getVehicleByProvidedData(currentVehicleUrl);

      await this.showVehicleOptions(ctx, vehicle);
      return ctx.scene.leave();
    });

    const editDescScene = new Scenes.WizardScene<IBotContext>(
      "edit_descr_scene",
      async (ctx) => {
        await ctx.reply("Введите описание для этого автомобиля:");
        return ctx.wizard.next();
      },
      editDescrHandler,
    );

    return [addVehicleScene, editDescScene];
  }

  async showVehicleOptions(ctx: IBotContext, vehicle: any | null) {
    if (!vehicle) {
      await ctx.reply("Пожалуйста, выберите авто.");
      return;
    }

    const vehicleUrl = vehicle.url;
    const vehicleDesc = vehicle.description;

    let message = `Информация о машине по ссылке: ${vehicleUrl}\n\n`;

    if (vehicleDesc) {
      message += `Описание:\n${vehicleDesc}\n\n`;
    } else {
      message += "Описание отсутствует.\n\n";
    }

    // const photoLinks = vehicleData ? vehicleData.match(/Photo: .*/g) : [];
    // const photoCount = photoLinks ? photoLinks.length : 0;

    // message += `Загружено фото: ${photoCount}\n`;

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
