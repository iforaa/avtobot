// import { Composer, Scenes } from "telegraf";
// import { Context } from "telegraf/typings/context";

// const vehicleWizardScene = (bot: any) => {
//   // Step handler for entering a URL for a vehicle
//   const addVehicleHandler = new Composer<Scenes.WizardContext>();
//   addVehicleHandler.on("text", async (ctx) => {
//     const url = cleanUrl(ctx.message?.text);
//     if (vehicleDatabase[url]) {
//       await ctx.reply("Авто уже есть в базе данных.");
//       ctx.session.vehicleUrl = url;
//       await showVehicleOptions(ctx);
//     } else {
//       vehicleDatabase[url] = url; // Adding to mock DB
//       ctx.session.vehicleUrl = url;
//       await ctx.reply("Новое авто добавлено!");

//       await showVehicleOptions(ctx);
//     }
//     return ctx.scene.leave();
//   });

//   // Wizard scene for adding a vehicle
//   const addVehicleScene = new Scenes.WizardScene<Scenes.WizardContext>(
//     "add_vehicle_scene",
//     async (ctx) => {
//       await ctx.reply("Введи URL из объявления:");
//       return ctx.wizard.next();
//     },
//     addVehicleHandler,
//   );

//   async function showVehicleOptions(ctx: Context) {
//     // Retrieve the vehicleUrl from the session
//     const vehicleUrl = ctx.session.vehicleUrl;

//     // Ensure that the vehicle URL is available
//     if (!vehicleUrl) {
//       await ctx.reply("Пожалуйста, выберите авто.");
//       return;
//     }

//     // Retrieve the vehicle information from the database
//     const vehicleData = vehicleDatabase[vehicleUrl];

//     // Prepare the message with the description and photo count
//     let message = `Информация о машине по ссылке: ${vehicleUrl}\n\n`;

//     // Append the description if available
//     if (vehicleData && vehicleData.includes("Description:")) {
//       const description = vehicleData.match(/Description: .*/g);
//       if (description) {
//         message += `Описание:\n${description[0].replace("Description: ", "")}\n\n`;
//       }
//     } else {
//       message += "Описание отсутствует.\n\n";
//     }

//     // Count the photos (look for "Photo:" entries in the vehicle data)
//     const photoLinks = vehicleData ? vehicleData.match(/Photo: .*/g) : [];
//     const photoCount = photoLinks ? photoLinks.length : 0;

//     message += `Загружено фото: ${photoCount}\n`;

//     // Send the message with options to attach more photos, edit description, or view photos
//     await ctx.reply(message, {
//       reply_markup: {
//         inline_keyboard: [
//           [{ text: "Прикрепить фото", callback_data: "attach_photos" }],
//           [{ text: "Прикрепить видео", callback_data: "attach_video" }],
//           [{ text: "Добавить описание", callback_data: "edit_info" }],
//           [{ text: "Просмотреть Фото", callback_data: "view_vehicle_photos" }], // View photos button
//         ],
//       },
//     });
//   }

//   bot.action("attach_photos", async (ctx) => {
//     const vehicleUrl = ctx.session.vehicleUrl;

//     // Ensure that the vehicle URL is available
//     if (!vehicleUrl) {
//       await ctx.reply("Выбери авто для начала.");
//       return;
//     }

//     await ctx.reply("Присылай фото, по одной");

//     // Listen for multiple photos sent by the user
//     bot.on("photo", async (ctx) => {
//       const photos = ctx.message.photo;

//       // Select only the largest version of the photo (the last one in the array)
//       const largestPhoto = photos[photos.length - 1];
//       const fileId = largestPhoto.file_id;

//       // Download and save the file locally, then get the saved file path
//       const savedFilePath = await downloadAndSaveFile(fileId, vehicleUrl);

//       // Append the saved file path to the vehicle's database entry
//       vehicleDatabase[vehicleUrl] =
//         (vehicleDatabase[vehicleUrl] || "") + ` Photo: ${savedFilePath}\n`;

//       await ctx.reply("Фото добавлено!");

//       // After attaching the photos, provide options to add more or go back
//       await ctx.reply("Хочешь добавить еще фото или вернуться обратно?", {
//         reply_markup: {
//           inline_keyboard: [
//             [{ text: "Добавить еще фото", callback_data: "add_another_photo" }],
//             [{ text: "Назад", callback_data: "go_back" }],
//           ],
//         },
//       });
//     });
//   });

//   bot.action("add_another_photo", async (ctx) => {
//     await ctx.reply("Добавляй еще фото.");
//   });
//   // Handler for viewing just the photos
//   bot.action("view_vehicle_photos", async (ctx) => {
//     // Retrieve the vehicleUrl from the session
//     const vehicleUrl = ctx.session.vehicleUrl;

//     // Ensure that the vehicle URL is available
//     if (!vehicleUrl) {
//       await ctx.reply("Пожалуйста, выберите авто.");
//       return;
//     }

//     // Retrieve the vehicle information from the database
//     const vehicleData = vehicleDatabase[vehicleUrl];

//     // If no data is available for this vehicle
//     if (!vehicleData) {
//       await ctx.reply("Нет доступной информации для этого авто.");
//       return;
//     }

//     // Now handle and send all the photos
//     const photoLinks = vehicleData.match(/Photo: .*/g); // Extract photo lines
//     if (photoLinks) {
//       // Prepare the array for sendMediaGroup (Telegram limits to 10 items per album)
//       const mediaGroup = photoLinks.slice(0, 10).map((photo) => {
//         const photoPath = photo.replace("Photo: ", "").trim();
//         return { type: "photo", media: { source: photoPath } };
//       });

//       // Send the photos as an album
//       try {
//         await ctx.telegram.sendMediaGroup(ctx.chat.id, mediaGroup);
//         await ctx.reply("✅ Фотки доставлены!");
//       } catch (error) {
//         console.error("Error sending photo album:", error);
//         await ctx.reply("❌ Не удалось отправить альбом фотографий.");
//       }
//     } else {
//       await ctx.reply("Фотографии отсутствуют.");
//     }
//   });

//   // Handler for going back to the vehicle options
//   bot.action("go_back", async (ctx) => {
//     await showVehicleOptions(ctx);
//   });

//   // Handler for adding a description to the vehicle
//   bot.action("edit_info", async (ctx) => {
//     // Retrieve the vehicleUrl from the session
//     const vehicleUrl = ctx.session.vehicleUrl;

//     // Ensure that the vehicle URL is available
//     if (!vehicleUrl) {
//       await ctx.reply("Пожалуйста, выберите авто.");
//       return;
//     }

//     // Ask the user to enter a description for the vehicle
//     await ctx.reply("Введите описание для этого автомобиля:");

//     // Listen for the next text message (the user's description)
//     bot.on("text", async (ctx) => {
//       const description = ctx.message.text;

//       // Store the description in the vehicleDatabase
//       vehicleDatabase[vehicleUrl] =
//         (vehicleDatabase[vehicleUrl] || "") + ` Description: ${description}\n`;

//       // Confirm that the description has been added
//       await ctx.reply("Описание добавлено успешно!");

//       // Return the user to the vehicle options menu
//       await showVehicleOptions(ctx);
//     });
//   });
// };

// function cleanUrl(url: string): string {
//   // Find the position of the question mark
//   const index = url.indexOf("?");

//   // If there is no question mark, return the original URL
//   if (index === -1) {
//     return url;
//   }

//   // Otherwise, return the URL up to the question mark
//   return url.substring(0, index);
// }

// export default vehicleWizardScene;
