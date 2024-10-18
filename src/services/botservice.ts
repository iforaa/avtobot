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

  async addVehicle(vehicleName: string, userID: number): Promise<number> {
    // Perform any business logic or validation here if needed
    if (!vehicleName) {
      throw new Error("Vehicle name is required");
    }

    return this.vehicleRepository.addVehicle(cleanUrl(vehicleName), userID);
  }

  async getVehiclesByUserId(userId: number): Promise<any[]> {
    return this.vehicleRepository.getVehiclesByUserId(userId);
  }

  async getVehicleById(vehicleId: number): Promise<any> {
    return this.vehicleRepository.getVehicleById(vehicleId);
  }

  async getVehicleByProvidedData(url: string): Promise<any | null> {
    const vehicle = this.vehicleRepository.getVehicleByURL(cleanUrl(url));
    if (vehicle) {
      return vehicle;
    } else {
      return null;
    }
  }

  async addDescriptionToVehicle(description: string, url: string) {
    const newDescription = this.vehicleRepository.addDescriptionToVehicle(
      description,
      url,
    );
  }

  async getPhotosOfVehicle(vehicleUrl: string): Promise<string[]> {
    return await this.vehicleRepository.getPhotosByVehicleUrl(vehicleUrl);
  }

  async addPhotoToVehicle(filename: string, vehicleUrl: string) {
    await this.vehicleRepository.addPhotoToVehicle(filename, vehicleUrl);
  }

  async downloadFileFromTelegramAndSaveToDatastore(
    fileLink: URL,
    filename: string,
  ) {
    try {
      const response = await axios.get(fileLink.toString(), {
        responseType: "arraybuffer",
      });

      if (response.status === 200) {
        const photo = Buffer.from(response.data);
        const dataStoreFilename = await this.datastoreService.uploadFile(
          photo,
          filename,
        );
        return dataStoreFilename;
      } else {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(`Error downloading file: ${error}`);
    }
  }
}
