import * as fs from "fs"; // For file system operations
import * as path from "path";
import { createHash } from "crypto";
import fetch from "node-fetch";
import { fileURLToPath, URL } from "url";
import { dirname } from "path";
import { IBotContext } from "../context/context.interface";
/*
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PHOTO_FOLDER_PATH = path.resolve(__dirname, "vehicle_photos");

if (!fs.existsSync(PHOTO_FOLDER_PATH)) {
  fs.mkdirSync(PHOTO_FOLDER_PATH);
}

export async function downloadAndSaveFile(
  ctx: IBotContext,
  fileId: string,
  vehicleUrl: string,
) {
  // Hash the vehicle URL to use as part of the filename
  const hashedVehicleUrl = hashVehicleUrl(vehicleUrl);

  // Define the file path to save the photo locally
  const filePath = path.join(
    PHOTO_FOLDER_PATH,
    `${hashedVehicleUrl}_${fileId}.jpg`,
  );
  const fileLink: URL = await ctx.telegram.getFileLink(fileId);

  // Fetch and save the file
  const response = await fetch(fileLink.toString());
  const buffer = await response.buffer();

  // Save the file to the specified path
  fs.writeFileSync(filePath, buffer);

  return filePath; // Return the file path to save in the database
}

function hashVehicleUrl(vehicleUrl: string) {
  return createHash("sha256").update(vehicleUrl).digest("hex").substring(0, 16); // Shorten hash to 8 characters
}
*/
