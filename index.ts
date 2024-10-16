// import fetch from "node-fetch"; // To download the file
// import * as fs from "fs"; // For file system operations
// import * as path from "path";
// import { createHash } from "crypto";
// import { fileURLToPath } from "url";
// import { dirname } from "path";
// import vehicleWizardScene from "./vehicleWizardScene";

// // import vehicleWizard from "./vehicleWizardScene";

// // Fix __dirname for ES modules
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

// import { message } from "telegraf/filters";
// import { Composer, Context, Scenes, session, Telegraf } from "telegraf";

// const vehicleDatabase: { [key: string]: string } = {};
// const PHOTO_FOLDER_PATH = path.resolve(__dirname, "vehicle_photos");

// // Ensure the folder exists
// if (!fs.existsSync(PHOTO_FOLDER_PATH)) {
//   fs.mkdirSync(PHOTO_FOLDER_PATH);
// }

// function hashVehicleUrl(vehicleUrl: string) {
//   return createHash("sha256").update(vehicleUrl).digest("hex").substring(0, 16); // Shorten hash to 8 characters
// }

// const bot = new Telegraf<Scenes.WizardContext>(
//   "7938362393:AAEbQK4xOXcDvI5-9JpTqQh7EiBTTzCSfwk",
// );

// const stepHandler = new Composer<Scenes.WizardContext>();

// const checkInviteCode = new Composer<Scenes.WizardContext>();
// checkInviteCode.on("text", async (ctx) => {
//   const inviteCode = ctx.message?.text;
//   if (inviteCode === "123") {
//     await ctx.reply("Верный код. Добро пожаловать!");
//     await showMainMenu(ctx);
//     return ctx.scene.leave();
//   } else {
//     await ctx.reply("Неверный код. Попробуй еще раз.");
//   }
// });

// // Function to display the main menu
// async function showMainMenu(ctx: Context) {
//   await ctx.reply("Главное Меню", {
//     reply_markup: {
//       inline_keyboard: [
//         [{ text: "1. Добавить авто", callback_data: "add_vehicle" }],
//         [{ text: "2. Ранее добавленные авто", callback_data: "my_vehicles" }],
//       ],
//     },
//   });
// }

// const inviteCodeScene = new Scenes.WizardScene<Scenes.WizardContext>(
//   "invite_code_scene",
//   async (ctx) => {
//     await ctx.reply(
//       "Привет! Это специализированный маркетплейс для автоподборщиков. Мы закрытый клуб для своих, чтобы присоедениться, тебе нужно ввести пригласительный код:",
//     );
//     return ctx.wizard.next();
//   },
//   checkInviteCode,
// );

// bot.action("my_vehicles", async (ctx) => {
//   const vehicleList = Object.keys(vehicleDatabase);
//   if (vehicleList.length > 0) {
//     await ctx.reply("Добавленные авто: \n" + vehicleList.join("\n"));
//   } else {
//     await ctx.reply("Пока нет добавленных авто.");
//   }
// });

// // Stage to combine all scenes
// const stage = new Scenes.Stage<Scenes.WizardContext>([
//   inviteCodeScene,
//   vehicleWizardScene,
// ]);

// // Middleware
// bot.use(session());
// bot.use(stage.middleware());

// // Enter the invitation code scene when the bot starts
// bot.start((ctx) => ctx.scene.enter("invite_code_scene"));

// // Add Vehicle handler (Start the scene)
// bot.action("add_vehicle", (ctx) => ctx.scene.enter("add_vehicle_scene"));

// // Function to show options after vehicle is created (now showing descriptions and photo count)

// // Handler for attaching multiple photos

// bot.launch();
