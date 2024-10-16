import { DBRepository } from "../repository/db.repository";

export class BotService {
  constructor(private readonly vehicleRepository: DBRepository) {}

  async addVehicle(vehicleName: string): Promise<number> {
    // Perform any business logic or validation here if needed
    if (!vehicleName) {
      throw new Error("Vehicle name is required");
    }

    // Add vehicle using the repository
    return this.vehicleRepository.addVehicle(vehicleName);
  }

  async getVehicleById(vehicleId: number): Promise<any> {
    // Additional logic before fetching a vehicle can be added here
    return this.vehicleRepository.getVehicleById(vehicleId);
  }
}
