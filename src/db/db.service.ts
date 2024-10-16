import { neon } from "@neondatabase/serverless";

export class DbService {
  private sql: any;

  constructor(connectionString: string) {
    // Initialize the Neon connection
    this.sql = neon(connectionString);
  }

  async query(queryText: string, params?: any[]): Promise<any> {
    try {
      // Execute the query with the provided parameters
      const result = await this.sql(queryText, params);
      return result;
    } catch (error) {
      console.error("Error executing query:", error);
      throw error;
    }
  }
}
