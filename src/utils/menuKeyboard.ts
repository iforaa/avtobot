export let ADD_CAR_MENU = "📝 Отчет";
export let ALL_CARS_MENU = "🚗 Мои отчеты";
export let PROFILE_MENU = "👤 Профиль";
export let CLOSE_MENU = "❎ Закрыть";

export async function mainMenu(ctx: any) {
  await ctx.replyOrEditMessage("🚗🚗🚗", {
    reply_markup: {
      keyboard: [
        [
          {
            text: ALL_CARS_MENU,
          },
          { text: ADD_CAR_MENU },
          { text: PROFILE_MENU },
        ],
      ],
      resize_keyboard: true,
    },
  });
}
