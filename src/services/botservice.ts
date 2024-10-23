import { DBRepository } from "../repository/db.repository";
import { cleanUrl } from "../utils/cleanurl";
import { DatastoreService } from "./datastore.service";
import axios from "axios";

export class BotService {
  constructor(
    private readonly vehicleRepository: DBRepository,
    private readonly datastoreService: DatastoreService,
  ) {}

  async addUser(userID: number) {
    this.vehicleRepository.addUser(userID);
  }

  async getUser(userID: number): Promise<any[]> {
    return this.vehicleRepository.getUser(userID);
  }

  async addVehicleByProvidedData(
    data: string,
    userID: number,
  ): Promise<number> {
    const urlPattern = /^(https?:\/\/[^\s$.?#].[^\s]*)$/i;
    const vinPattern = /^[A-HJ-NPR-Z0-9]{17}$/i;
    const chassisPattern = /^[A-HJ-NPR-Z0-9]{9,12}$/i;

    if (urlPattern.test(data)) {
      return this.vehicleRepository.addVehicleByURL(cleanUrl(data), userID);
    } else if (vinPattern.test(data) || chassisPattern.test(data)) {
      return this.vehicleRepository.addVehicleByVin(data, userID);
    } else {
      throw new TypeError("Incorrect input");
    }
  }

  async getVehiclesByUserId(userId: number): Promise<any[]> {
    return this.vehicleRepository.getVehiclesByUserId(userId);
  }

  async getVehicleById(vehicleId: number): Promise<any> {
    return await this.vehicleRepository.getVehicleById(vehicleId);
  }

  async editVehicleUrlOrVin(data: string, id: number): Promise<any | null> {
    const urlPattern = /^(https?:\/\/[^\s$.?#].[^\s]*)$/i;
    const vinPattern = /^[A-HJ-NPR-Z0-9]{17}$/i;
    const chassisPattern = /^[A-HJ-NPR-Z0-9]{9,12}$/i;

    if (urlPattern.test(data)) {
      await this.vehicleRepository.editVehicleURL(cleanUrl(data), id);
    } else if (vinPattern.test(data) || chassisPattern.test(data)) {
      await this.vehicleRepository.editVehicleVIN(data, id);
    } else {
      throw new TypeError("Incorrect input");
    }
  }

  async getVehicleByProvidedData(data: string): Promise<any | null> {
    const urlPattern = /^(https?:\/\/[^\s$.?#].[^\s]*)$/i;
    const vinPattern = /^[A-HJ-NPR-Z0-9]{17}$/i;
    const chassisPattern = /^[A-HJ-NPR-Z0-9]{9,12}$/i;

    if (urlPattern.test(data)) {
      const vehicle = await this.vehicleRepository.getVehicleByURLOrVin(
        cleanUrl(data),
      );
      if (vehicle) {
        return vehicle;
      } else {
        return null;
      }
    } else if (vinPattern.test(data) || chassisPattern.test(data)) {
      const vehicle = await this.vehicleRepository.getVehicleByURLOrVin(data);
      if (vehicle) {
        return vehicle;
      } else {
        return null;
      }
    } else {
      throw new TypeError("Incorrect input");
    }
  }

  async getDescriptionByVehicle(id: number): Promise<string | null> {
    return await this.vehicleRepository.getDescriptionByVehicleID(id);
  }
  async addDescriptionToVehicle(description: string, id: number) {
    const newDescription = await this.vehicleRepository.addDescriptionToVehicle(
      description,
      id,
    );
  }

  async getPhotosOfVehicle(id: number): Promise<string[]> {
    return await this.vehicleRepository.getPhotosByVehicleID(id);
  }

  async addPhotoToVehicle(filename: string, id: number) {
    await this.vehicleRepository.addPhotoToVehicle(filename, id);
  }

  async downloadFileFromTelegramAndSaveToDatastore(
    fileLink: URL,
    filename: string,
    type: string,
  ) {
    try {
      if (fileLink.toString().startsWith("file://")) {
        // Remove the 'file://' and 'localhost' from the URL, and extract the local path
        const filePath = fileLink.pathname;

        // On macOS (Darwin), the filePath will start with '/', which is correct for fs
        const fs = require("fs").promises;
        const photo = await fs.readFile(filePath); // Read the file directly from the disk
        const dataStoreFilename = await this.datastoreService.uploadFile(
          photo,
          filename,
          type,
        );
        return dataStoreFilename;
      } else {
        const response = await axios.get(fileLink.toString(), {
          responseType: "arraybuffer",
        });

        if (response.status === 200) {
          const photo = Buffer.from(response.data);
          const dataStoreFilename = await this.datastoreService.uploadFile(
            photo,
            filename,
            type,
          );
          return dataStoreFilename;
        } else {
          throw new Error(`Failed to download file: ${response.statusText}`);
        }
      }
    } catch (error) {
      throw new Error(`Error downloading file: ${error}`);
    }
  }
}
