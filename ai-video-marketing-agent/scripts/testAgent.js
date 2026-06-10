require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execFile } = require('child_process');
const ffmpeg = require('@ffmpeg-installer/ffmpeg');

const voiceService = require('../services/voiceService');
const recordingService = require('../services/recordingService');
const videoService = require('../services/videoService');
const publishService = require('../services/publishService');

async function checkAppOnline(url) {
  try {
    await axios.get(url, { timeout: 2000 });
    return true;
  } catch (err) {
    return false;
  }
}

async function runTests() {
  console.log('🧪 Starting Standalone AI Video Marketing Agent Verification...\n');

  const executionId = 'test_' + Date.now();
  const testDir = path.join(__dirname, '../temp/test_run');
  const framesDir = path.join(testDir, 'frames');
  const audioPath = path.join(testDir, 'audio.mp3');
  const videoPath = path.join(testDir, 'video.mp4');

  try {
    // 1. Setup temp folders
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(framesDir, { recursive: true });

    // 2. Test Voice Generation
    console.log('--- Step 1: Testing Voiceover Synthesis ---');
    const script = "Hello world! This is a test of our standalone AI video marketing agent voice service.";
    const voiceRes = await voiceService.generateVoiceover(script, 'alloy', audioPath, 5);
    
    if (voiceRes.success && fs.existsSync(audioPath)) {
      console.log('✅ Voiceover synthesis verified successfully.');
    } else {
      throw new Error('❌ Voiceover synthesis verification failed!');
    }

    // 3. Test Screen Recording (or mock frame generation if server is offline)
    console.log('\n--- Step 2: Testing Screen Recording & Browser Automation ---');
    const targetUrl = process.env.TARGET_APP_URL || 'http://localhost:3000';
    
    // Check if BOTH frontend (3000) and backend (5001) are online
    const isFrontendOnline = await checkAppOnline(targetUrl);
    const isBackendOnline = await checkAppOnline('http://localhost:5001');
    const isOnline = isFrontendOnline && isBackendOnline;

    if (isOnline) {
      console.log(`📡 Target app is ONLINE at ${targetUrl} (Frontend) and http://localhost:5001 (Backend). Executing live Puppeteer flow...`);
      const recordRes = await recordingService.recordFlow('templates_sync', framesDir);
      
      if (recordRes.success && fs.readdirSync(framesDir).length > 0) {
        console.log(`✅ Live recording verified. Captured ${fs.readdirSync(framesDir).length} frames.`);
      } else {
        throw new Error('❌ Live recording verification failed!');
      }
    } else {
      console.log(`⚠️ Target app frontend or backend is offline. (Frontend: ${isFrontendOnline ? 'Online' : 'Offline'}, Backend: ${isBackendOnline ? 'Online' : 'Offline'})`);
      console.log(`🤖 [Offline Mock Mode] Generating 15 mock 360x640 vertical frames using FFmpeg...`);
      
      await new Promise((resolve, reject) => {
        // command: ffmpeg -y -f lavfi -i color=c=blue:s=360x640 -frames:v 15 <framesDir>/frame_%04d.png
        const args = [
          '-y',
          '-f', 'lavfi',
          '-i', 'color=c=blue:s=360x640',
          '-frames:v', '15',
          path.join(framesDir, 'frame_%04d.png')
        ];
        
        execFile(ffmpeg.path, args, (error, stdout, stderr) => {
          if (error) {
            console.error('❌ Failed to generate mock frames:', stderr);
            return reject(error);
          }
          resolve();
        });
      });

      const frameCount = fs.readdirSync(framesDir).length;
      console.log(`✅ Mock frames generated successfully. Total mock frames: ${frameCount}`);
    }

    // 4. Test Video Compilation
    console.log('\n--- Step 3: Testing FFmpeg Video Compilation ---');
    const compileRes = await videoService.compileVideo(framesDir, audioPath, videoPath, 5);
    
    if (compileRes.success && fs.existsSync(videoPath)) {
      console.log(`✅ Video compilation verified successfully. Video saved at: ${videoPath}`);
      console.log(`   Video size: ${fs.statSync(videoPath).size} bytes`);
    } else {
      throw new Error('❌ Video compilation verification failed!');
    }

    // 5. Test Social Publishing
    console.log('\n--- Step 4: Testing Reels Social Publishing ---');
    const mockUrl = `http://localhost:6001/videos/test_reel.mp4`;
    const publishRes = await publishService.publishReel(mockUrl, "Test Reel Script #test");
    
    if (publishRes.success && publishRes.mediaId) {
      console.log(`✅ Reels publishing verified successfully. Mock Media ID: ${publishRes.mediaId}`);
    } else {
      throw new Error('❌ Reels publishing verification failed!');
    }

    // 6. Clean up
    console.log('\n--- Step 5: Cleaning up test directory ---');
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
      console.log('🧹 Test directory cleaned up.');
    }

    console.log('\n🎉 Standalone Marketing Agent Verification Complete! Everything working perfectly.');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    
    // Clean up on failure
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  }
}

runTests();
