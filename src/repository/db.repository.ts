import { DbService } from "../services/db.service";

export class DBRepository {
  constructor(private readonly dbService: DbService) {}

  async addUser(userID: number) {
    const query =
      "INSERT INTO users (username, user_id) VALUES ($1, $2) RETURNING id";
    const result = await this.dbService.query(query, ["_", userID]);
    return result.id;
  }

  async getUser(userID: number): Promise<any[]> {
    const query = "SELECT * FROM users WHERE user_id=$1";
    const result = await this.dbService.query(query, [userID]);
    return result;
  }

  async addVehicleByURL(url: string, userID: number): Promise<number> {
    const query =
      "INSERT INTO vehicles (url, user_id) VALUES ($1, $2) RETURNING id";
    const result = await this.dbService.query(query, [url, userID]);
    return result[0].id;
  }
  async addVehicleByVin(vin: string, userID: number): Promise<number> {
    const query =
      "INSERT INTO vehicles (vin, user_id) VALUES ($1, $2) RETURNING id";
    const result = await this.dbService.query(query, [vin, userID]);
    return result[0].id;
  }

  async getVehiclesByUserId(userId: number): Promise<any[]> {
    const query = "SELECT * FROM vehicles WHERE user_id = $1";
    const result = await this.dbService.query(query, [userId]);
    return result;
  }

  async getVehicleById(vehicleId: number): Promise<any> {
    const query = "SELECT * FROM vehicles WHERE id = $1";
    const result = await this.dbService.query(query, [vehicleId]);
    return result[0];
  }

  async getDescriptionByVehicleID(id: number): Promise<string | null> {
    const query = "SELECT description FROM vehicles WHERE id = $1";

    try {
      const result = await this.dbService.query(query, [id]);

      // Check if the vehicle was found
      if (result.length > 0) {
        return result[0].description; // Return the description
      } else {
        return null; // Vehicle with the provided URL not found
      }
    } catch (error) {
      console.error("Error retrieving vehicle description:", error);
      throw error;
    }
  }

  async addDescriptionToVehicle(description: string, id: number): Promise<any> {
    const query =
      "UPDATE vehicles SET description = $1 WHERE id = $2 RETURNING *";
    try {
      const result = await this.dbService.query(query, [description, id]);

      // Check if the vehicle was found and updated
      if (result.length > 0) {
        return result[0]; // Return the updated vehicle
      } else {
        return null; // Vehicle with the provided URL not found
      }
    } catch (error) {
      console.error("Error updating vehicle description:", error);
      throw error;
    }
  }

  async getPhotosByVehicleID(id: number): Promise<string[]> {
    const query = `
      SELECT p.photo_url
      FROM photos p
      JOIN vehicles v ON p.vehicle_id = v.id
      WHERE v.id = $1;
    `;

    try {
      const result = await this.dbService.query(query, [id]);

      if (result.length > 0) {
        // Extract photo URLs from the query result
        return result.map((row: any) => row.photo_url);
      } else {
        return []; // No photos found for this vehicle
      }
    } catch (error) {
      console.error("Error retrieving photos for vehicle:", error);
      throw error;
    }
  }

  async addPhotoToVehicle(filename: string, id: number): Promise<any> {
    const query = `
      INSERT INTO photos (vehicle_id, photo_url)
      VALUES ($1, $2)
      RETURNING *;
    `;

    try {
      const result = await this.dbService.query(query, [id, filename]);

      if (result.length > 0) {
        return result[0]; // Return the inserted photo record
      } else {
        throw new Error("Failed to insert the photo.");
      }
    } catch (error) {
      console.error("Error inserting photo for vehicle:", error);
      throw error;
    }
  }

  async getVehicleByURL(url: string): Promise<any> {
    const query = "SELECT * FROM vehicles WHERE url = $1";
    const result = await this.dbService.query(query, [url]);

    if (result === null) {
      console.error("Failed to fetch vehicle from database.");
      return null;
    }

    console.log(result);

    if (result.length > 0) {
      return result[0];
    } else {
      return null;
    }
  }

  async editVehicleURL(newUrl: string, id: number): Promise<any> {
    const query = "UPDATE vehicles SET url = $1 WHERE id = $2 RETURNING *";
    try {
      const result = await this.dbService.query(query, [newUrl, id]);

      if (result === null || result.length === 0) {
        console.error("Failed to update vehicle URL. Vehicle ID not found.");
        return null;
      }

      console.log("Vehicle URL updated:", result[0]);
      return result[0]; // Return the updated vehicle
    } catch (error) {
      console.error("Error updating vehicle URL:", error);
      throw new Error("Error updating vehicle URL");
    }
  }

  async editVehicleVIN(newVin: string, id: number): Promise<any> {
    const query = "UPDATE vehicles SET vin = $1 WHERE id = $2 RETURNING *";
    try {
      const result = await this.dbService.query(query, [newVin, id]);

      if (result === null || result.length === 0) {
        console.error("Failed to update vehicle VIN. Vehicle ID not found.");
        return null;
      }

      console.log("Vehicle VIN updated:", result[0]);
      return result[0]; // Return the updated vehicle
    } catch (error) {
      console.error("Error updating vehicle VIN:", error);
      throw new Error("Error updating vehicle VIN");
    }
  }

  async getVehicleByURLOrVin(data: string): Promise<any> {
    const query = "SELECT * FROM vehicles WHERE url = $1 OR vin = $1";
    const result = await this.dbService.query(query, [data]);

    if (result === null) {
      console.error("Failed to fetch vehicle from database.");
      return null;
    }

    console.log(result);

    if (result.length > 0) {
      return result[0];
    } else {
      return null;
    }
  }
}
