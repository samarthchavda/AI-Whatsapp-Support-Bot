const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function run() {
  console.log('Launching browser to screenshot AI Marketing Agent Dashboard...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });

  try {
    await page.goto('http://localhost:6001', { waitUntil: 'networkidle2', timeout: 15000 });
    console.log('Page loaded successfully. Capturing screenshot...');
    
    // Save to the artifacts media directory
    const outputFileName = 'media_video_agent_light_theme_' + Date.now() + '.png';
    const outputPath = path.join('/Users/chavdasamarth/.gemini/antigravity/brain/839e0853-cee6-48df-8010-2f28f2e77a29', outputFileName);
    
    await page.screenshot({ path: outputPath, fullPage: false });
    console.log(`✅ Screenshot saved to: ${outputPath}`);
  } catch (err) {
    console.error('Error during screenshot:', err.message);
  } finally {
    await browser.close();
  }
}

run();
