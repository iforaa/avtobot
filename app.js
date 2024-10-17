"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const telegraf_1 = require("telegraf");
const config_service_1 = require("./src/config/config.service");
const start_command_1 = require("./src/commands/start.command");
const telegraf_session_local_1 = __importDefault(require("telegraf-session-local"));
const add_vehicles_command_1 = require("./src/commands/add.vehicles.command");
const db_repository_1 = require("./src/repository/db.repository");
const botservice_1 = require("./src/services/botservice");
const db_service_1 = require("./src/services/db.service");
const add_photos_command_1 = require("./src/commands/add.photos.command");
const datastore_service_1 = require("./src/services/datastore.service");
class Bot {
    constructor(configService) {
        this.configService = configService;
        this.commands = [];
        this.bot = new telegraf_1.Telegraf(this.configService.get("TOKEN"));
        this.bot.use(new telegraf_session_local_1.default({ database: "sessions.json" }).middleware());
        this.botService = new botservice_1.BotService(new db_repository_1.DBRepository(new db_service_1.DbService(this.configService.get("PG_ADDRESS"))), new datastore_service_1.DatastoreService(this.configService.get("DATASTORE_URL")));
    }
    init() {
        this.commands = [
            new start_command_1.StartCommand(this.bot, this.botService),
            new add_vehicles_command_1.AddVehicleCommand(this.bot, this.botService),
            new add_photos_command_1.AddPhotoCommand(this.bot, this.botService),
        ];
        const scenes = [];
        for (const command of this.commands) {
            scenes.push(...command.scenes());
        }
        const stage = new telegraf_1.Scenes.Stage(scenes);
        this.bot.use(stage.middleware());
        for (const command of this.commands) {
            command.handle();
        }
        this.bot.launch();
    }
}
const bot = new Bot(new config_service_1.ConfigService());
bot.init();
