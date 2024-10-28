import axios from "axios";
import FormData from "form-data";

export class DatastoreService {
  constructor(private readonly datastoreURL: string) {}

  // Method to handle file upload
  async uploadFile(
    file: Buffer,
    fileName: string,
    type: string,
  ): Promise<string> {
    const formData = new FormData();
    formData.append("photo", file, fileName);
    formData.append("type", type);

    try {
      const response = await axios.post(
        `${this.datastoreURL}/upload`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
        },
      );

      if (response.status === 200) {
        return response.data.key;
      } else {
        throw new Error(`Failed to upload file: ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(`Error uploading file: ${error}`);
    }
  }

  // Method to handle file download
  async downloadFile(fileName: string): Promise<Buffer> {
    try {
      const response = await axios.get(
        `${this.datastoreURL}/download/${fileName}`,
        {
          responseType: "arraybuffer",
        },
      );

      if (response.status === 200) {
        return Buffer.from(response.data);
      } else {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(`Error downloading file: ${error}`);
    }
  }

  async deleteFile(fileKey: string, type: "photo" | "video"): Promise<void> {
    try {
      const fileKey_ = fileKey.replace("photos/", "").replace("videos/", "");

      console.log(`LINK: ${this.datastoreURL}/delete/${fileKey_}/${type}`);
      const response = await axios.delete(
        `${this.datastoreURL}/delete/${fileKey_}/${type}`,
      );

      if (response.status === 200) {
        console.log("File deleted successfully.");
      } else {
        throw new Error(`Failed to delete file: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error deleting file: ${error}`);
      throw new Error(`Error deleting file: ${error}`);
    }
  }
}
