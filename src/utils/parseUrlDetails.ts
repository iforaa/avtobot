export function constructLinkForVehicle(vehicle: any) {
  let message: string = "";
  if (vehicle.url) {
    const carDetails = parseURLDetails(vehicle.url);
    if (carDetails) {
      message += `<a href="${vehicle.url}"><b>${carDetails.brand} ${carDetails.model}</b>\n${carDetails.year}</a>`;
    } else {
      message += `<a href="${vehicle.url}">Ссылка</a>`; // Placeholder text with URL
    }
  } else if (vehicle.vin) {
    message += `${vehicle.vin}`; // Placeholder text with URL
  }
  return message;
}

export function parseURLDetails(url: string) {
  try {
    const urlParts = url.split("/");

    // Extract the relevant part of the URL that contains the details
    const carDetailsPart = urlParts[5]; // This part contains brand_model_year

    // Split the car details part by underscores
    const carDetails = carDetailsPart.split("_");

    // Extract the brand, model (multiple parts), and year
    const brand = capitalizeWords(carDetails[0]);
    const model = capitalizeWords(carDetails.slice(1, -2).join(" ")); // Everything except the year and engine details
    const year = carDetails[carDetails.length - 2];

    return {
      brand,
      model,
      year,
    };
  } catch (error) {
    return null;
  }
}
function capitalizeWords(str: string) {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
