import { Context } from "telegraf";

export interface SessionData {
  passedValidation: boolean;
  vehicleDatabase: { [key: string]: string };
  vehicleUrl: string;
}

export interface IBotContext extends Context {
  session: SessionData;
}
