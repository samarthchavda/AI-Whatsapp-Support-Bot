const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('@ffmpeg-installer/ffmpeg');

class VideoService {
  /**
   * Stitch image frames and overlay audio into a vertical video
   * @param {string} framesDir Directory containing the sequence of frame PNG files
   * @param {string} audioPath Path to the MP3 voiceover file
   * @param {string} outputPath Target path to output the MP4 video
   * @param {number} frameRate Frame rate used to capture screens (default: 10)
   * @returns {Promise<{success: boolean, videoPath: string}>}
   */
  /**
   * Download royalty-free background music if it doesn't already exist
   * @returns {Promise<void>}
   */
  async downloadBackgroundMusic() {
    const musicPath = path.resolve(__dirname, '../assets/background.mp3');
    if (fs.existsSync(musicPath)) return;

    console.log(`📡 Video Service: Downloading background music loop from SoundHelix...`);
    const dir = path.dirname(musicPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const https = require('https');
    const url = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
    
    return new Promise((resolve) => {
      https.get(url, (response) => {
        if (response.statusCode !== 200) {
          console.warn(`⚠️ Failed to download background music: Status ${response.statusCode}`);
          return resolve();
        }
        const fileStream = fs.createWriteStream(musicPath);
        response.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          console.log(`✅ Video Service: Background music downloaded successfully at: ${musicPath}`);
          resolve();
        });
        fileStream.on('error', (err) => {
          fs.unlink(musicPath, () => {});
          console.warn(`⚠️ Background music file stream error:`, err.message);
          resolve();
        });
      }).on('error', (err) => {
        console.warn(`⚠️ Background music download connection failed:`, err.message);
        resolve();
      });
    });
  }

  /**
   * Stitch image frames and overlay audio into a vertical video
   * @param {string} framesDir Directory containing the sequence of frame PNG files
   * @param {string} audioPath Path to the MP3 voiceover file
   * @param {string} outputPath Target path to output the MP4 video
   * @param {number} frameRate Frame rate used to capture screens (default: 10)
   * @returns {Promise<{success: boolean, videoPath: string}>}
   */
  async compileVideo(framesDir, audioPath, outputPath, frameRate = 10) {
    // Ensure background music is downloaded/present
    await this.downloadBackgroundMusic();

    return new Promise((resolve, reject) => {
      console.log(`🎬 Video Service: Compiling video files...`);
      console.log(`   Frames Directory: ${framesDir}`);
      console.log(`   Voiceover Audio: ${audioPath}`);
      console.log(`   Output Video: ${outputPath}`);

      // Check if frames exist
      if (!fs.existsSync(framesDir) || fs.readdirSync(framesDir).length === 0) {
        return reject(new Error('❌ Video Service: No image frames found to compile.'));
      }

      // Ensure target folder exists
      const targetDir = path.dirname(outputPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const musicPath = path.resolve(__dirname, '../assets/background.mp3');
      const hasMusic = fs.existsSync(musicPath);

      const args = [
        '-y',
        '-framerate', String(frameRate),
        '-i', path.join(framesDir, 'frame_%04d.png'),
        '-i', audioPath
      ];

      if (hasMusic) {
        console.log(`🎵 Video Service: Mixing background music from ${musicPath}...`);
        args.push('-i', musicPath);
        args.push(
          '-filter_complex', '[1:a]volume=1.0[v];[2:a]volume=0.08[bg];[v][bg]amix=inputs=2:duration=first[a]',
          '-map', '0:v',
          '-map', '[a]'
        );
      }

      args.push(
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-shortest',
        outputPath
      );

      console.log(`🎬 Video Service: Running FFmpeg command: ${ffmpeg.path} ${args.join(' ')}`);

      execFile(ffmpeg.path, args, (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Video Service: FFmpeg compilation error:', stderr);
          return reject(error);
        }

        console.log(`✅ Video Service: Video compilation completed successfully!`);
        resolve({
          success: true,
          videoPath: outputPath
        });
      });
    });
  }
}

module.exports = new VideoService();
