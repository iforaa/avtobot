import { DbService } from "../db/db.service";

export class DBRepository {
  constructor(private readonly dbService: DbService) {}

  async addVehicle(vehicleName: string): Promise<number> {
    const query = "INSERT INTO vehicles (name) VALUES ($1) RETURNING id";
    const result = await this.dbService.query(query, [vehicleName]);
    return result.rows[0].id;
  }

  async getVehicleById(vehicleId: number): Promise<any> {
    const query = "SELECT * FROM vehicles WHERE id = $1";
    const result = await this.dbService.query(query, [vehicleId]);
    return result.rows[0];
  }

  // Add more methods as needed
}
