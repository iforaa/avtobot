const accumulators: {
  [key: string]: { photos: any[]; timeout: NodeJS.Timeout | null };
} = {};

export const uploadUserPhotos = async (
  message: any,
  filenames: (images: Array<{ type: string; fileId: string }>) => void,
): Promise<void> => {
  const userId = message.from.id;
  const mediaGroupId = message.media_group_id;
  const images: Array<{ type: string; fileId: string }> = [];

  // Initialize accumulator for this user if not present
  if (!accumulators[userId]) {
    accumulators[userId] = { photos: [], timeout: null };
  }

  if (mediaGroupId) {
    // If message is part of a media group, add to accumulator
    accumulators[userId].photos.push(message);

    // Reset and extend the timeout every time a new message in the group arrives
    if (accumulators[userId].timeout) {
      clearTimeout(accumulators[userId].timeout);
    }

    // Set a new timeout, adding a delay to ensure all groups are received
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
    }, 3000); // Wait for 3 seconds after the last message arrives
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
