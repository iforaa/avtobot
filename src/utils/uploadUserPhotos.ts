const accumulators: {
  [key: string]: { photos: any[]; timeout: NodeJS.Timeout | null };
} = {};

export const uploadUserPhotos = async (
  message: any,
  filenames: (images: Array<{ type: string; fileId: string }>) => void,
): Promise<void> => {
  const userId = message.from.id; // Use user ID as unique identifier for each upload session
  const mediaGroupId = message.media_group_id;
  const images: Array<{ type: string; fileId: string }> = [];

  // Initialize accumulator for this user if not present
  if (!accumulators[userId]) {
    accumulators[userId] = { photos: [], timeout: null };
  }

  // If message is part of a media group
  if (mediaGroupId) {
    accumulators[userId].photos.push(message);

    // Reset any existing timeout to wait for more photos
    if (accumulators[userId].timeout) {
      clearTimeout(accumulators[userId].timeout);
    }

    // Set a new timeout to finalize and process all photos after messages stop arriving
    accumulators[userId].timeout = setTimeout(async () => {
      const messages = accumulators[userId].photos;

      // Process each message in the accumulated messages
      for (const msg of messages) {
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

      if (images.length === 0) throw new Error("No images found");

      // Trigger the upload with all accumulated images
      filenames(images);

      // Clean up the accumulator for the user
      delete accumulators[userId];
    }, 2000); // Wait for 2 seconds to ensure all messages are collected
  } else {
    // Single photo or video outside a media group
    if (message.photo) {
      const photo = message.photo[message.photo.length - 1];
      const fileId = photo.file_id;
      images.push({ type: "photo", fileId });
    } else if (message.video) {
      const video = message.video;
      const fileId = video.file_id;
      images.push({ type: "video", fileId });
    }

    if (images.length === 0) throw new Error("No images found");

    filenames(images);
  }
};
