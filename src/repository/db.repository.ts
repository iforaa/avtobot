import { DbService } from "../services/db.service";
import { parseURLDetails } from "../utils/parseUrlDetails";

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
    const carDetails = parseURLDetails(url);

    // Set default values if brand or model is null
    const brand = carDetails?.brand || "н/д";
    const model = carDetails?.model || "н/д";

    const query = `
        INSERT INTO vehicles (url, user_id, mark, model)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `;

    const result = await this.dbService.query(query, [
      url,
      userID,
      brand,
      model,
    ]);
    return result[0].id;
  }

  async addVehicleByVin(vin: string, userID: number): Promise<number> {
    const query =
      "INSERT INTO vehicles (vin, user_id) VALUES ($1, $2) RETURNING id";
    const result = await this.dbService.query(query, [vin, userID]);
    return result[0].id;
  }

  async getVehiclesByUserId(userId: number): Promise<any[]> {
    const query =
      "SELECT * FROM vehicles WHERE user_id = $1 ORDER BY created_at DESC";
    const result = await this.dbService.query(query, [userId]);
    return result;
  }

  async getVehicleById(vehicleId: number): Promise<any> {
    const query = "SELECT * FROM vehicles WHERE id = $1";
    const result = await this.dbService.query(query, [vehicleId]);
    return result[0];
  }

  async getModelByVehicleID(id: number): Promise<string | null> {
    const query = "SELECT model FROM vehicles WHERE id = $1";

    try {
      const result = await this.dbService.query(query, [id]);

      // Check if the vehicle was found
      if (result.length > 0) {
        return result[0].model; // Return the description
      } else {
        return null; // Vehicle with the provided URL not found
      }
    } catch (error) {
      console.error("Error retrieving vehicle description:", error);
      throw error;
    }
  }

  async getMarkByVehicleID(id: number): Promise<string | null> {
    const query = "SELECT mark FROM vehicles WHERE id = $1";

    try {
      const result = await this.dbService.query(query, [id]);

      // Check if the vehicle was found
      if (result.length > 0) {
        return result[0].mark; // Return the description
      } else {
        return null; // Vehicle with the provided URL not found
      }
    } catch (error) {
      console.error("Error retrieving vehicle description:", error);
      throw error;
    }
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
  async addRemoteReportLinkToVehicle(
    remoteLink: string,
    id: number,
  ): Promise<any> {
    const query =
      "UPDATE vehicles SET remote_report_link = $1 WHERE id = $2 RETURNING *";
    try {
      const result = await this.dbService.query(query, [remoteLink, id]);

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

  async addMarkToVehicle(mark: string, id: number): Promise<any> {
    const query = "UPDATE vehicles SET mark = $1 WHERE id = $2 RETURNING *";
    try {
      const result = await this.dbService.query(query, [mark, id]);

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

  async addModelToVehicle(model: string, id: number): Promise<any> {
    const query = "UPDATE vehicles SET model = $1 WHERE id = $2 RETURNING *";
    try {
      const result = await this.dbService.query(query, [model, id]);

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

  async deletePhotoByURL(vehicleID: number, photoURL: string): Promise<void> {
    const query = `
        DELETE FROM photos
        WHERE vehicle_id = $1 AND photo_url = $2;
      `;

    try {
      const result = await this.dbService.query(query, [vehicleID, photoURL]);

      if (result.rowCount === 0) {
        console.warn(
          "No photo found to delete with the specified URL and vehicle ID.",
        );
      } else {
        console.log("Photo deleted successfully.");
      }
    } catch (error) {
      console.error("Error deleting photo for vehicle:", error);
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
