import { Context } from "telegraf";
import { Scenes } from "telegraf";
import { SessionContext } from "telegraf/typings/session";
import { PhotoSection } from "../utils/photoSection";

export interface SessionData extends Scenes.WizardSession<WizardSession> {
  reportsCurrentPage: number;

  currentPage: number;
  currentVehicle: any;
  currentVehicleID: number;
  currentPhotoIndex: number;
  vehicles: any[];
  reports: any[];
  canBeEditedMessage?: any;
  mediaGroupsMessage: any[];
  anyMessagesToDelete: any[];

  createVehicleUserID: number;
  createVehicleIdentifier: string;

  photoSectionNumber: number;

  previouseMessage?: any;
}

interface WizardSession extends Scenes.WizardSessionData {
  myWizardSessionProp: number;
}

export interface IBotContext extends Context {
  replyOrEditMessage: (text: string, keyboardOptions: object) => Promise<any>;
  replyOrEditPhoto: (
    photoUrl: string,
    caption: string,
    keyboardOptions: object,
  ) => Promise<any>;

  session: SessionData;
  scene: Scenes.SceneContextScene<IBotContext, Scenes.WizardSessionData>;
  wizard: Scenes.WizardContextWizard<IBotContext>;
}
