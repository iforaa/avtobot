import { Context } from "telegraf";
import { Scenes } from "telegraf";
import { SessionContext } from "telegraf/typings/session";

export interface SessionData extends Scenes.WizardSession<WizardSession> {
  passedValidation: boolean;
  currentVehicleUrl: string;
  vehicles: any[];
}

interface WizardSession extends Scenes.WizardSessionData {
  myWizardSessionProp: number;
}

export interface IBotContext extends Context {
  session: SessionData;
  scene: Scenes.SceneContextScene<IBotContext, Scenes.WizardSessionData>;
  wizard: Scenes.WizardContextWizard<IBotContext>;
}
