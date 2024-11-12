import Ffmpeg from "fluent-ffmpeg";

export async function compressVideo(
  inputPath: string,
  outputPath: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Probe the video to get metadata
    Ffmpeg(inputPath).ffprobe((err: Error, metadata) => {
      if (err) {
        console.error(`FFmpeg probe error: ${err.message}`);
        return reject(err);
      }

      const { width, height } = metadata.streams[0]; // Extract video resolution
      console.log(`Video resolution: ${width}x${height}`);

      const command = Ffmpeg(inputPath)
        .videoCodec("libx264")
        .audioCodec("aac")
        .outputOptions(["-crf 28", "-preset fast"]);

      // Conditionally scale the video if height is greater than 720 or already small
      if (height && height > 480) {
        command.size("?x480"); // Scale down to a height of 720 while maintaining aspect ratio
      } else {
        console.log("Skipping resizing: video is already small.");
      }

      command
        .on("end", () => resolve(outputPath))
        .on("error", (err: Error) => {
          console.error(`FFmpeg error: ${err.message}`);
          reject(err);
        })
        .save(outputPath);
    });
  });
}
