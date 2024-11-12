import { DBRepository } from "../repository/db.repository";
import { cleanUrl } from "../utils/cleanurl";
import { DatastoreService } from "./datastore.service";
import axios from "axios";
import * as fs from "fs/promises";
import * as path from "path";
import { compressVideo } from "../utils/videoCompress";
import * as os from "os";

export class BotService {
  constructor(
    private readonly vehicleRepository: DBRepository,
    private readonly datastoreService: DatastoreService,
  ) {}

  datastoreURLFile(): string {
    return this.datastoreService.datastoreURLFile;
  }

  private generateInviteCode(): string {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString(); // Example: '5482392847'
  }

  // Generate or fetch an invite code for an inviter
  async generateOrFetchInvite(inviterUserId: number): Promise<string> {
    let invite =
      await this.vehicleRepository.getActiveInviteByInviter(inviterUserId);

    if (!invite) {
      const inviteCode = this.generateInviteCode();
      await this.vehicleRepository.saveInvite(inviterUserId, inviteCode);
      return inviteCode;
    }

    return invite.code;
  }

  async isRedeemable(codes: string): Promise<boolean> {
    const [code1, code2] = codes.split(" ");
    if (!code1 || !code2) return false;
    const invite1 = await this.vehicleRepository.getInviteByCode(code1);
    const invite2 = await this.vehicleRepository.getInviteByCode(code2);

    if (invite1 && invite2 && !invite1.redeemed_at && !invite2.redeemed_at) {
      return true;
    }
    return false;
  }

  // Redeem two invite codes for a new user
  async redeemInvite(codes: string, inviteeUserId: number): Promise<boolean> {
    const [code1, code2] = codes.split(" ");

    if (!code1 || !code2) return false;

    const invite1 = await this.vehicleRepository.getInviteByCode(code1);
    const invite2 = await this.vehicleRepository.getInviteByCode(code2);

    if (invite1 && invite2 && !invite1.redeemed_at && !invite2.redeemed_at) {
      // Redeem both invites
      await this.vehicleRepository.redeemInvite(code1, inviteeUserId);
      await this.vehicleRepository.redeemInvite(code2, inviteeUserId);
      return true;
    }

    return false;
  }

  async addUser(userID: number, username: string) {
    this.vehicleRepository.addUser(userID, username);
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

  async getVehiclesByProvidedData(data: string): Promise<any[]> {
    const urlPattern = /^(https?:\/\/[^\s$.?#].[^\s]*)$/i;
    const vinPattern = /^[A-HJ-NPR-Z0-9]{17}$/i;
    const chassisPattern = /^[A-HJ-NPR-Z0-9]{9,12}$/i;

    if (urlPattern.test(data)) {
      const vehicles = await this.vehicleRepository.getVehicleByURLOrVin(
        cleanUrl(data),
      );

      return vehicles;
    } else if (vinPattern.test(data) || chassisPattern.test(data)) {
      const vehicles = await this.vehicleRepository.getVehicleByURLOrVin(data);
      return vehicles;
    } else {
      throw new TypeError("Incorrect input");
    }
  }

  async deletePhoto(vehicleID: number, photoName: string) {
    const type = photoName.startsWith("photos/") ? "photo" : "video";

    await this.datastoreService.deleteFile(photoName, type);

    return await this.vehicleRepository.deletePhotoByURL(vehicleID, photoName);
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

  async getMarkByVehicle(id: number): Promise<string | null> {
    return await this.vehicleRepository.getMarkByVehicleID(id);
  }

  async getModelByVehicle(id: number): Promise<string | null> {
    return await this.vehicleRepository.getModelByVehicleID(id);
  }

  async addModelToVehicle(model: string, id: number) {
    const newModel = await this.vehicleRepository.addModelToVehicle(model, id);
  }

  async addMarkToVehicle(mark: string, id: number) {
    const newMark = await this.vehicleRepository.addMarkToVehicle(mark, id);
  }

  async addRemoteReportLinkToVehicle(remoteLink: string, id: number) {
    await this.vehicleRepository.addRemoteReportLinkToVehicle(remoteLink, id);
  }

  async addYearToVehicle(year: number, id: number) {
    await this.vehicleRepository.addYearToVehicle(year, id);
  }

  async addMileageToVehicle(mileage: number, id: number) {
    await this.vehicleRepository.addMileageToVehicle(mileage, id);
  }

  async addStarsToVehicle(stars: number, id: number) {
    await this.vehicleRepository.addStarsToVehicle(stars, id);
  }

  async getPhotosOfVehicle(id: number, section?: number): Promise<any[]> {
    return await this.vehicleRepository.getPhotosByVehicleID(id, section);
  }

  async addPhotoToVehicle(filename: string, id: number, section: number) {
    await this.vehicleRepository.addPhotoToVehicle(filename, id, section);
  }

  sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  }

  async downloadFileFromTelegramAndSaveToDatastore(
    fileLink: URL,
    filename: string,
    type: string,
  ): Promise<string> {
    try {
      let fileBuffer: Buffer;

      if (fileLink.toString().startsWith("file://")) {
        // Remove the 'file://' and 'localhost' from the URL, and extract the local path
        const filePath = fileLink.pathname;

        // Read the file directly from the disk
        fileBuffer = await fs.readFile(filePath);
      } else {
        // Download the file using axios
        const response = await axios.get<Buffer>(fileLink.toString(), {
          responseType: "arraybuffer",
        });

        if (response.status === 200) {
          fileBuffer = response.data;
        } else {
          throw new Error(`Failed to download file: ${response.statusText}`);
        }
      }

      // Handle video compression if it's a video
      if (type === "video") {
        const sanitizedFilename = this.sanitizeFilename(filename);
        const extension = ".mp4";
        const tempDir = os.tmpdir(); // System temporary directory
        const tempInputPath = path.join(
          tempDir,
          `temp_${sanitizedFilename}${extension}`,
        );
        const tempOutputPath = path.join(
          tempDir,
          `compressed_${sanitizedFilename}${extension}`,
        );

        // Write the file to disk temporarily
        await fs.writeFile(tempInputPath, fileBuffer);

        // Compress the video
        await compressVideo(tempInputPath, tempOutputPath);

        // Read the compressed file back into a buffer
        fileBuffer = await fs.readFile(tempOutputPath);

        // Clean up temporary files
        await fs.unlink(tempInputPath);
        await fs.unlink(tempOutputPath);
      }

      // Upload the file to the datastore
      const dataStoreFilename = await this.datastoreService.uploadFile(
        fileBuffer,
        filename,
        type,
      );
      return dataStoreFilename;
    } catch (error) {
      throw new Error(
        `downloadFileFromTelegramAndSaveToDatastore: ${(error as Error).message}`,
      );
    }
  }
}
