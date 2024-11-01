export function constructLinkForVehicle(vehicle: any) {
  let message: string = "";
  if (vehicle.url) {
    const carDetails = parseURLDetails(vehicle.url);
    if (carDetails) {
      message += `<a href="${vehicle.url}"><b>${carDetails.brand} ${carDetails.model}</b>\n${carDetails.year}</a>`;
    } else {
      message += `<a href="${vehicle.url}">Ссылка</a>`; // Placeholder text with URL
    }
  }
  if (vehicle.vin) {
    message += `\nVIN: ${vehicle.vin}`;
    if (vehicle.url === null) {
      // if (!vehicle.url) {
      message += "\n";
      message +=
        vehicle.mark != null ? `${capitalizeFirstLetter(vehicle.mark)} ` : "";
      message +=
        vehicle.model != null ? `${capitalizeFirstLetter(vehicle.model)} ` : "";
      message += vehicle.year != null ? `${vehicle.year} ` : "";
      message +=
        vehicle.mileage != null ? `${vehicle.mileage.capitalized}` : "";
    }
  }

  return message;
}

function capitalizeFirstLetter(val: string) {
  return val.charAt(0).toUpperCase() + val.slice(1);
}

export function parseURLDetails(url: string) {
  try {
    const urlParts = url.split("/");

    // Extract the relevant part of the URL that contains the details
    const carDetailsPart = urlParts[5]; // This part contains brand_model_year_mileage

    // Split the car details part by underscores
    const carDetails = carDetailsPart.split("_");

    // Determine the current year for the upper range
    const currentYear = new Date().getFullYear();
    const yearIndex = carDetails.findIndex(
      (part) =>
        /^\d{4}$/.test(part) &&
        parseInt(part) >= 1900 &&
        parseInt(part) <= currentYear + 1,
    );

    if (yearIndex === -1) {
      throw new Error("Year not found in the URL");
    }

    // Extract brand, model, year, and mileage based on the identified year
    const brand = capitalizeWords(carDetails[0]);
    const model = capitalizeWords(carDetails.slice(1, yearIndex).join(" "));
    const year = carDetails[yearIndex];
    let mileageText = carDetails.slice(yearIndex + 1).join("_");
    mileageText = mileageText.replace(/_km.*$/, "_km");
    const mileage = parseMileage(mileageText);

    return {
      brand,
      model,
      year,
      mileage,
    };
  } catch (error) {
    return null;
  }
}

function parseMileage(mileageText: string): number | null {
  // Match mileage pattern with underscores as thousand separators and "km" at the end
  const mileageMatch = mileageText.match(/^(\d{1,3}(?:_\d{3})*)_km$/i);
  if (mileageMatch) {
    // Remove underscores and parse as integer
    return parseInt(mileageMatch[1].replace(/_/g, ""), 10);
  }
  return null;
}

function capitalizeWords(str: string) {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
