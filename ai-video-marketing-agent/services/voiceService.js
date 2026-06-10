const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const OpenAI = require('openai');
const ffmpeg = require('@ffmpeg-installer/ffmpeg');

class VoiceService {
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    this.isDummyKey = !apiKey || apiKey === 'your_openai_api_key_here' || apiKey === 'sk-test-key';
    
    if (!this.isDummyKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  /**
   * Generate an MP3 voiceover from a script text
   * @param {string} text The text script to read
   * @param {string} voiceName Voice model name (alloy, echo, fable, onyx, nova, shimmer)
   * @param {string} outputPath Target path to write the MP3 file
   * @param {number} estimatedDuration Optional estimated video length in seconds (used for fallback silent audio)
   * @returns {Promise<{success: boolean, duration: number}>}
   */
  async getAudioDuration(filePath) {
    return new Promise((resolve) => {
      execFile(ffmpeg.path, ['-i', filePath], (error, stdout, stderr) => {
        const match = stderr.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
        if (match) {
          const hours = parseInt(match[1], 10);
          const minutes = parseInt(match[2], 10);
          const seconds = parseInt(match[3], 10);
          const hundredths = parseInt(match[4], 10);
          const totalSeconds = hours * 3600 + minutes * 60 + seconds + hundredths / 100;
          resolve(totalSeconds);
        } else {
          resolve(15); // Fallback
        }
      });
    });
  }

  /**
   * Helper to generate a voiceover offline using macOS 'say' or silent FFmpeg fallback
   */
  async generateOfflineVoiceover(text, voiceName, outputPath, estimatedDuration) {
    // Check if we are on macOS to use the native 'say' command
    if (process.platform === 'darwin') {
      console.log(`ℹ️ Using macOS 'say' command for offline AI voiceover...`);
      try {
        await new Promise((resolve, reject) => {
          const tempAiffPath = outputPath.replace('.mp3', '.aiff');
          const voiceMap = {
            alloy: 'Alex',
            echo: 'Daniel',
            fable: 'Tessa',
            onyx: 'Alex',
            nova: 'Samantha',
            shimmer: 'Karen'
          };
          const macVoice = voiceMap[voiceName] || 'Samantha';

          execFile('say', ['-v', macVoice, '-o', tempAiffPath, text], (error, stdout, stderr) => {
            if (error) {
              console.log(`⚠️ macOS 'say' failed with voice '${macVoice}'. Retrying with default system voice...`);
              execFile('say', ['-o', tempAiffPath, text], (retryError, retryStdout, retryStderr) => {
                if (retryError) {
                  return reject(retryError);
                }
                convertAiffToMp3(tempAiffPath, resolve, reject);
              });
            } else {
              convertAiffToMp3(tempAiffPath, resolve, reject);
            }
          });

          function convertAiffToMp3(aiffPath, res, rej) {
            const args = [
              '-y',
              '-i', aiffPath,
              '-codec:a', 'libmp3lame',
              '-qscale:a', '2',
              outputPath
            ];
            execFile(ffmpeg.path, args, (convError, convStdout, convStderr) => {
              try { fs.unlinkSync(aiffPath); } catch (e) {}
              if (convError) {
                return rej(convError);
              }
              res();
            });
          }
        });

        console.log(`✅ Voice Service: macOS offline voiceover generated successfully at: ${outputPath}`);
        const duration = await this.getAudioDuration(outputPath);
        return { success: true, duration };

      } catch (macError) {
        console.warn(`⚠️ macOS offline voiceover failed, falling back to silent audio:`, macError.message);
      }
    }

    // Silent fallback (non-macOS or if 'say' failed)
    console.log(`⚠️ Generating a mock silent voiceover file using FFmpeg...`);
    await new Promise((resolve, reject) => {
      const args = [
        '-y',
        '-f', 'lavfi',
        '-i', `anullsrc=r=44100:cl=mono`,
        '-t', String(estimatedDuration),
        outputPath
      ];
      execFile(ffmpeg.path, args, (error, stdout, stderr) => {
        if (error) return reject(error);
        resolve();
      });
    });

    console.log(`✅ Voice Service: Mock silent voiceover generated successfully at: ${outputPath}`);
    return { success: true, duration: estimatedDuration };
  }

  /**
   * Generate an MP3 voiceover from a script text
   * @param {string} text The text script to read
   * @param {string} voiceName Voice model name (alloy, echo, fable, onyx, nova, shimmer)
   * @param {string} outputPath Target path to write the MP3 file
   * @param {number} estimatedDuration Optional estimated video length in seconds (used for fallback silent audio)
   * @returns {Promise<{success: boolean, duration: number}>}
   */
  async generateVoiceover(text, voiceName = 'alloy', outputPath, estimatedDuration = 10) {
    try {
      console.log(`🎙️ Voice Service: Starting voiceover synthesis...`);
      console.log(`   Voice: ${voiceName}`);
      console.log(`   Script: "${text.substring(0, 60)}..."`);

      // Ensure parent directory exists
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (this.isDummyKey) {
        return await this.generateOfflineVoiceover(text, voiceName, outputPath, estimatedDuration);
      }

      // Live OpenAI TTS Call
      try {
        console.log(`📡 Sending live OpenAI TTS request...`);
        const response = await this.openai.audio.speech.create({
          model: 'tts-1',
          voice: voiceName,
          input: text
        });

        const buffer = Buffer.from(await response.arrayBuffer());
        await fs.promises.writeFile(outputPath, buffer);
        
        console.log(`✅ Voice Service: Voiceover synthesized successfully at: ${outputPath}`);
        const duration = await this.getAudioDuration(outputPath);
        return { success: true, duration };
      } catch (liveError) {
        console.warn(`⚠️ Live OpenAI TTS request failed: ${liveError.message}. Falling back to offline voiceover...`);
        return await this.generateOfflineVoiceover(text, voiceName, outputPath, estimatedDuration);
      }

    } catch (error) {
      console.error('❌ Voice Service Error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new VoiceService();
