const accumulators: {
  [key: string]: { photos: any[]; timeout: NodeJS.Timeout | null };
} = {};

export const uploadUserPhotos = async (
  message: any,
  filenames: (image: Array<{ type: string; fileId: string }>) => void,
): Promise<void> => {
  const images: Array<{ type: string; fileId: string }> = [];
  const mediaGroupId = message.media_group_id;

  // Block executed if user sends multiple photos (media_group_id exists)
  if (mediaGroupId) {
    if (!accumulators[mediaGroupId]) {
      accumulators[mediaGroupId] = { photos: [], timeout: null };
    }

    // Add the current message to the accumulator
    accumulators[mediaGroupId].photos.push(message);

    // Clear any existing timeout to wait for all images in the group
    if (accumulators[mediaGroupId].timeout) {
      clearTimeout(accumulators[mediaGroupId].timeout);
    }

    // Set a new timeout to process all images in the group
    accumulators[mediaGroupId].timeout = setTimeout(async () => {
      const photos = accumulators[mediaGroupId].photos;

      for (const msg of photos) {
        // Process each photo in the media group
        if (msg.photo) {
          const photo = msg.photo[msg.photo.length - 1];
          const fileId = photo.file_id;
          images.push({ type: "photo", fileId });
        } else if (msg.video) {
          const video = msg.video;
          const fileId = video.file_id;
          images.push({ type: "video", fileId });
        }
      }

      // Ensure there are images to return
      if (images.length === 0) throw new Error("Something went wrong");

      // Execute the callback with the array of image URLs or file IDs
      filenames(images);
      // Clean up the accumulator
      delete accumulators[mediaGroupId];
    }, 1500);
  } else {
    // Block executed if user sends a single photo
    //
    if (message.photo) {
      const photo = message.photo[message.photo.length - 1];
      const fileId = photo.file_id;
      images.push({ type: "photo", fileId });
    } else if (message.video) {
      const video = message.video;
      const fileId = video.file_id;
      images.push({ type: "video", fileId });
    }

    // Ensure there is an image to return
    if (images.length === 0) throw new Error("Something went wrong");

    // Execute the callback with the array of image URLs or file IDs
    filenames(images);
  }
};
