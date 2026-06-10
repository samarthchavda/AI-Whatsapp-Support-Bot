require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const OpenAI = require('openai');

const voiceService = require('./services/voiceService');
const recordingService = require('./services/recordingService');
const videoService = require('./services/videoService');
const publishService = require('./services/publishService');

const app = express();
const PORT = process.env.PORT || 6001;

app.use(express.json());

// Expose the temporary videos directory so they can be viewed/played in the browser
const videoOutDir = path.join(__dirname, 'temp/video');
if (!fs.existsSync(videoOutDir)) {
  fs.mkdirSync(videoOutDir, { recursive: true });
}
app.use('/videos', express.static(videoOutDir));

// Serve static dashboard assets
app.use(express.static(path.join(__dirname, 'public')));

// Global state to track active video generation progress
let activeGeneration = null;

// Initialize OpenAI client if valid key is set
const apiKey = process.env.OPENAI_API_KEY;
const isDummyKey = !apiKey || apiKey === 'your_openai_api_key_here' || apiKey === 'sk-test-key';
let openai = null;
if (!isDummyKey) {
  openai = new OpenAI({ apiKey });
}

/**
 * Helper to generate a video script using AI, falling back to a pre-defined premium script in development
 */
async function generateScript(flowType) {
  const prompts = {
    landing_overview: "Write an engaging short product introduction script for our AI WhatsApp Support Bot landing page, highlighting custom AI training on store policies, automated order status tracking, human handoff, and simple pricing starting at twenty-nine dollars a month.",
    templates_sync: "Write a short 30-second vertical social media reel script explaining how easy it is for a merchant to sync Meta WhatsApp templates and map them to order shipped updates in our dashboard.",
    chat_crm: "Write a short 30-second vertical social media reel script demonstrating our Live Chat CRM agent takeover toggle, showing how easy it is to pause the AI bot and reply to customers manually.",
    billing: "Write a short 30-second vertical social media reel script detailing our SaaS billing limits, active token usage tracking progress bars, and how to upgrade tiers in 1 click."
  };

  const fallbackScripts = {
    landing_overview: "Welcome to AI Support Bot! 🚀 The ultimate customer support workspace for commerce teams. We train AI on your store policies, automate order status tracking, and allow instant human takeover. Simple, scaleable support, starting at just twenty-nine dollars a month. Boost your store today! 📈",
    templates_sync: "Hey everyone! 👋 Check out how simple it is to sync your official WhatsApp templates on our dashboard. Just click 'Sync', map the event, and boom! Automated order shipping alerts are live. Real-time notifications, zero hassle! 🚀",
    chat_crm: "Tired of rigid AI bots? 🤖 In our Live Chat CRM, you can toggle the AI off with one simple click and take over the conversation instantly. It is live, real-time customer support at your fingertips, whenever you need it! 💬",
    billing: "Keep track of your WhatsApp usage, billing token limits, and subscription tiers in real-time. Upgrade in seconds via our dashboard to keep your automated customer service running 24/7! 📈"
  };

  const prompt = prompts[flowType] || prompts.billing;
  const fallback = fallbackScripts[flowType] || fallbackScripts.billing;

  // If Gemini API Key is available, use Gemini for script generation
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (geminiApiKey && geminiApiKey !== 'your_gemini_api_key_here' && geminiApiKey.length > 10) {
    try {
      console.log(`📡 Requesting script generation from Gemini...`);
      const axios = require('axios');
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
        {
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `You are a creative product marketer. Write a highly energetic, short social media caption/voiceover script under 70 words. Do not include sound effects or visual directions, just write spoken words. Topic: ${prompt}`
                }
              ]
            }
          ]
        }
      );
      
      const scriptText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (scriptText) {
        return scriptText.trim().replace(/\*+/g, ''); // Clean markdown asterisks
      }
    } catch (geminiError) {
      console.warn(`⚠️ Gemini script generation failed, using OpenAI/fallback option:`, geminiError.message);
    }
  }

  // Otherwise, use OpenAI if configured, or default to fallback script
  if (isDummyKey) {
    console.log(`ℹ️ [Development] Using pre-written script for "${flowType}"`);
    return fallback;
  }

  try {
    console.log(`📡 Requesting script generation from OpenAI...`);
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a creative product marketer. Write a highly energetic, short social media caption/voiceover script under 70 words. Do not include sound effects or visual directions, just write spoken words." },
        { role: "user", content: prompt }
      ],
      max_tokens: 100
    });
    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.warn(`⚠️ Script generation failed, using fallback script:`, error.message);
    return fallback;
  }
}

/**
 * Main orchestrator task to generate and publish a video
 */
async function runMarketingAgent(flowType = 'templates_sync', voiceName = 'alloy') {
  const executionId = Date.now();
  const framesDir = path.join(__dirname, `temp/frames_${executionId}`);
  const audioPath = path.join(__dirname, `temp/audio_${executionId}.mp3`);
  const videoName = `reel_${flowType}_${executionId}.mp4`;
  const videoPath = path.join(videoOutDir, videoName);

  console.log(`\n🚀 Starting Autonomous Marketing Workflow (ID: ${executionId})...`);
  
  activeGeneration = {
    executionId,
    flowType,
    voiceName,
    step: 'scripting',
    status: 'running',
    error: null
  };

  try {
    // 1. Script Generation
    const script = await generateScript(flowType);
    console.log(`📝 Generated Script: "${script}"`);

    // 2. Voiceover Synthesis
    activeGeneration.step = 'voiceover';
    const estimatedDuration = flowType === 'landing_overview' ? 18 : 15;
    const voiceResult = await voiceService.generateVoiceover(script, voiceName, audioPath, estimatedDuration);
    if (!voiceResult.success) {
      throw new Error(`Voiceover synthesis failed: ${voiceResult.error}`);
    }

    // 3. Puppeteer Screen Recording
    activeGeneration.step = 'recording';
    const recordResult = await recordingService.recordFlow(flowType, framesDir, script);
    if (!recordResult.success) {
      throw new Error(`Screen recording failed: ${recordResult.error}`);
    }

    // 4. Stitch Frames and Audio into MP4 Video
    activeGeneration.step = 'compiling';
    const videoResult = await videoService.compileVideo(framesDir, audioPath, videoPath, 10);
    if (!videoResult.success) {
      throw new Error(`Video compilation failed.`);
    }

    // 5. Publish to Social Media (Meta API)
    activeGeneration.step = 'publishing';
    // Local host serving path for simulation
    const localVideoUrl = `http://localhost:${PORT}/videos/${videoName}`;
    const caption = `${script}\n\n#saas #marketing #automation #ai #whatsapp #support #ecommerce`;
    
    const publishResult = await publishService.publishReel(localVideoUrl, caption);

    // Save metadata JSON alongside video
    const metaPath = videoPath.replace('.mp4', '.json');
    const metadata = {
      videoName,
      flowType,
      voiceName,
      script,
      caption,
      mediaId: publishResult.mediaId,
      createdAt: new Date().toISOString()
    };
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));

    // 6. Clean up temporary frame files and audio to save disk space
    console.log(`🧹 Cleaning up temporary assets...`);
    if (fs.existsSync(framesDir)) fs.rmSync(framesDir, { recursive: true, force: true });
    if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);

    console.log(`🎉 Autonomous Marketing Agent execution completed successfully!`);
    activeGeneration.status = 'success';
    activeGeneration.step = 'done';

    return {
      success: true,
      videoName,
      videoUrl: localVideoUrl,
      mediaId: publishResult.mediaId,
      script
    };

  } catch (error) {
    console.error(`❌ Autonomous Marketing Agent execution failed:`, error.message);
    
    if (activeGeneration) {
      activeGeneration.status = 'failed';
      activeGeneration.step = 'failed';
      activeGeneration.error = error.message;
    }

    // Clean up if error occurred
    if (fs.existsSync(framesDir)) fs.rmSync(framesDir, { recursive: true, force: true });
    if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    
    throw error;
  }
}

// --- Express API Router ---

// Get list of generated videos
app.get('/api/videos', (req, res) => {
  try {
    if (!fs.existsSync(videoOutDir)) {
      return res.json({ success: true, videos: [] });
    }
    const files = fs.readdirSync(videoOutDir);
    const videos = files
      .filter(file => file.endsWith('.mp4'))
      .map(file => {
        const filePath = path.join(videoOutDir, file);
        const metaPath = filePath.replace('.mp4', '.json');
        let metadata = {};
        if (fs.existsSync(metaPath)) {
          try {
            metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
          } catch (e) {
            console.error('Failed to parse metadata file:', metaPath, e.message);
          }
        }
        return {
          filename: file,
          url: `http://localhost:${PORT}/videos/${file}`,
          createdAt: fs.statSync(filePath).birthtime,
          flowType: metadata.flowType || (file.includes('chat_crm') ? 'chat_crm' : file.includes('billing') ? 'billing' : file.includes('landing_overview') ? 'landing_overview' : 'templates_sync'),
          voiceName: metadata.voiceName || 'alloy',
          script: metadata.script || "Hey everyone! 👋 Check out how simple it is to sync your official WhatsApp templates on our dashboard. Just click 'Sync', map the event, and boom! Automated order shipping alerts are live. Real-time notifications, zero hassle! 🚀",
          caption: metadata.caption || '',
          mediaId: metadata.mediaId || 'ig_mock_media_id_vsnr4fc8d'
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);

    res.json({ success: true, videos });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get active generation progress
app.get('/api/progress', (req, res) => {
  res.json({ success: true, activeGeneration });
});

// Endpoint to reset progress state (clears error or success state)
app.post('/api/progress/reset', (req, res) => {
  activeGeneration = null;
  res.json({ success: true });
});

// Trigger video generation manually
app.post('/api/generate', async (req, res) => {
  const { flowType = 'templates_sync', voice = 'alloy' } = req.body;
  
  if (!['templates_sync', 'chat_crm', 'billing', 'landing_overview'].includes(flowType)) {
    return res.status(400).json({ success: false, error: 'Invalid flowType. Must be templates_sync, chat_crm, billing, or landing_overview' });
  }

  // Trigger process asynchronously to avoid HTTP timeouts (as Puppeteer + FFmpeg takes ~15-30s)
  runMarketingAgent(flowType, voice)
    .then(result => {
      console.log(`⚡ Async generate response: Video ready at ${result.videoUrl}`);
    })
    .catch(err => {
      console.error(`❌ Async generate failed:`, err.message);
    });

  res.json({
    success: true,
    message: 'Marketing video generation started in the background. Check server console logs for status.'
  });
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`🚀 AI Video Marketing Agent server running on http://localhost:${PORT}`);
});

// --- Scheduled Cron Job (Daily Automation) ---
// Runs daily at 9:00 AM to generate and post a marketing Reel
cron.schedule('0 9 * * *', async () => {
  console.log(`⏰ Cron Trigger: Running scheduled daily video upload...`);
  
  // Randomly rotate feature showcase
  const features = ['templates_sync', 'chat_crm', 'billing', 'landing_overview'];
  const randomFeature = features[Math.floor(Math.random() * features.length)];
  const voices = ['alloy', 'nova', 'echo'];
  const randomVoice = voices[Math.floor(Math.random() * voices.length)];

  try {
    await runMarketingAgent(randomFeature, randomVoice);
    console.log(`✅ Daily scheduled video uploaded successfully!`);
  } catch (err) {
    console.error(`❌ Daily scheduled video upload failed:`, err.message);
  }
});

module.exports = { runMarketingAgent };
