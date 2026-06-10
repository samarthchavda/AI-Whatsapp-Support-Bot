# Implementation Plan - Standalone AI Video Marketing Agent

This plan outlines the design and implementation details for building a **standalone AI Video Marketing Agent** as a separate Node.js project. It will run independently, automate browser screen recording of target applications, generate voiceovers, compile vertical Reels (9:16), and auto-publish them.

## Goal Description
Create a new, dedicated repository `ai-video-marketing-agent` that automates product marketing. The standalone service will:
1. **Automate Browser Scenarios:** Use Puppeteer to launch a browser, navigate to a target web application (like our WhatsApp Bot dashboard), perform user flow actions, and capture frame sequences.
2. **Generate Script & Voice:** Query LLM APIs for marketing copy, then convert it to audio via OpenAI's Text-to-Speech API.
3. **Compile Reels:** Use a self-contained FFmpeg build to crop the captured flows to 9:16 format and merge the audio track and captions.
4. **Publish Automatically:** Post the completed Reel directly to Instagram Reels or Facebook Page Stories.
5. **Config & Run:** Standalone runner controlled via config files, `.env` settings, and an automated scheduler.

---

## User Review Required

> [!IMPORTANT]
> **Standalone Isolation:** We will initialize a brand new Node.js project folder in the workspace (e.g. `./ai-video-marketing-agent`) containing its own `package.json`, `.env` file, and dependencies.
>
> **Self-Contained Dependencies:**
> * **Puppeteer:** For launching automated user flows.
> * **@ffmpeg-installer/ffmpeg:** Provides static FFmpeg binary files directly in the node modules, meaning no manual system-wide software installation is required.
> * **OpenAI & Meta API Clients:** For TTS voiceovers and social publishing.

---

## Proposed Changes (New Project Structure)

We will initialize a new folder `ai-video-marketing-agent/` with the following structure:

### 1. Foundation & Configuration

#### [NEW] `package.json`
* Define standard script entries (`npm start`, `npm run dev`) and install standalone dependencies (`puppeteer`, `openai`, `dotenv`, `@ffmpeg-installer/ffmpeg`, `node-cron`, `axios`).

#### [NEW] `.env`
* Key settings:
  ```env
  PORT=6001
  OPENAI_API_KEY=your_openai_api_key_here
  TARGET_APP_URL=http://localhost:3000
  TARGET_APP_EMAIL=demo@store.com
  TARGET_APP_PASSWORD=password123
  META_ACCESS_TOKEN=your_meta_page_token
  INSTAGRAM_BUSINESS_ID=your_instagram_account_id
  ```

---

### 2. Standalone Core Services

#### [NEW] `services/voiceService.js`
* Synthesizes scripts into MP3 voiceovers using OpenAI's TTS service.

#### [NEW] `services/recordingService.js`
* Puppeteer automation scripts designed to log into the target application and record features (e.g. Templates sync flow or Live Chat takeovers) by capturing screenshots to a temp folder.

#### [NEW] `services/videoService.js`
* Invokes the packaged static FFmpeg binary to crop raw screenshots to vertical 9:16 aspect ratio, sync the AI voiceover audio, overlay dynamic captions, and save the resulting MP4.

#### [NEW] `services/publishService.js`
* Authenticates and uploads Reels/Stories to Instagram via the official Meta Graph API.

#### [NEW] `app.js`
* Main entry point registering the scheduler (cron jobs running daily) to automatically record flows, generate media files, and publish social updates.

---

## Verification Plan

### Automated Simulation Tests
* Build a verification script `scripts/testAgent.js` to:
  1. Verify standalone Puppeteer runs and records screenshots.
  2. Synthesize test audio using OpenAI TTS.
  3. Compile a sample 9:16 MP4 video using the static FFmpeg package.
  4. Output test logs verifying correct execution.

### Manual Verification
* Run the standalone project.
* Trigger a test run manually and view the finalized `.mp4` video locally.
