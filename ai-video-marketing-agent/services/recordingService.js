const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const puppeteer = require('puppeteer');
const fs = require('fs');

class RecordingService {
  constructor() {
    this.frameRate = 10; // 10 frames per second
    this.frameInterval = 1000 / this.frameRate; // 100ms
  }

  async openSidebar(page) {
    console.log(`   Opening sidebar...`);
    await page.evaluate(() => {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) {
        sidebar.style.transform = 'translateX(0)';
        sidebar.style.transition = 'transform 0.4s ease-in-out';
        sidebar.style.position = 'fixed';
        sidebar.style.zIndex = '1000';
      }
    });
    await page.waitForTimeout(600);
  }

  async closeSidebar(page) {
    console.log(`   Closing sidebar...`);
    await page.evaluate(() => {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) {
        sidebar.style.transform = 'translateX(-100%)';
      }
    });
    await page.waitForTimeout(800);
  }

  async clickSidebarLink(page, selector) {
    console.log(`   Clicking sidebar link: ${selector}...`);
    await page.waitForSelector(selector, { timeout: 10000 });
    const element = await page.$(selector);
    if (element) {
      // Smoothly scroll the sidebar container to center the element
      await page.evaluate((el) => {
        const nav = el.closest('.sidebar-nav') || document.querySelector('.sidebar-nav');
        if (nav) {
          const navRect = nav.getBoundingClientRect();
          const elRect = el.getBoundingClientRect();
          const targetScrollTop = nav.scrollTop + (elRect.top - navRect.top) - (navRect.height / 2);
          nav.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
        }
      }, element);
      await page.waitForTimeout(800); // Wait for smooth scroll animation to capture
      
      // Programmatically click to ensure reliability
      await page.evaluate((el) => el.click(), element);
    } else {
      throw new Error(`Sidebar link element not found: ${selector}`);
    }
  }

  async smoothScroll(page, distance, durationMs) {
    console.log(`   Scrolling smoothly by ${distance}px...`);
    const steps = 20;
    const delay = durationMs / steps;
    const scrollStep = distance / steps;
    
    for (let i = 0; i < steps; i++) {
      await page.evaluate((step) => {
        window.scrollBy({ top: step, behavior: 'auto' });
      }, scrollStep);
      await page.waitForTimeout(delay);
    }
  }

  async smoothScrollTo(page, selector, durationMs) {
    console.log(`   Scrolling smoothly to selector: ${selector}...`);
    const targetY = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) {
        const rect = el.getBoundingClientRect();
        return window.pageYOffset + rect.top - 50;
      }
      return null;
    }, selector);

    if (targetY === null) {
      console.log(`   Selector not found: ${selector}`);
      return;
    }

    const currentY = await page.evaluate(() => window.pageYOffset);
    const distance = targetY - currentY;
    await this.smoothScroll(page, distance, durationMs);
  }

  async injectCaptionOverlay(page) {
    await page.evaluate(() => {
      const existing = document.getElementById('marketing-caption-overlay');
      if (existing) existing.remove();

      const overlay = document.createElement('div');
      overlay.id = 'marketing-caption-overlay';
      overlay.style.position = 'fixed';
      overlay.style.bottom = window.innerWidth < 500 ? '20px' : '40px';
      overlay.style.left = '50%';
      overlay.style.transform = 'translateX(-50%)';
      overlay.style.width = '85%';
      overlay.style.maxWidth = '600px';
      overlay.style.padding = '12px 20px';
      overlay.style.background = 'rgba(9, 9, 11, 0.85)';
      overlay.style.backdropFilter = 'blur(12px)';
      overlay.style.webkitBackdropFilter = 'blur(12px)';
      overlay.style.border = '1px solid rgba(255, 255, 255, 0.15)';
      overlay.style.borderRadius = '16px';
      overlay.style.color = '#fff';
      overlay.style.fontFamily = "'Outfit', 'Inter', -apple-system, sans-serif";
      overlay.style.fontSize = window.innerWidth < 500 ? '14px' : '18px';
      overlay.style.fontWeight = '700';
      overlay.style.textAlign = 'center';
      overlay.style.zIndex = '999999';
      overlay.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.6)';
      overlay.style.transition = 'transform 0.15s ease-out';
      overlay.style.lineHeight = '1.4';
      document.body.appendChild(overlay);
    });
  }

  async setCaption(page, text) {
    console.log(`   Caption text: "${text}"`);
    await page.evaluate((txt) => {
      const el = document.getElementById('marketing-caption-overlay');
      if (el) {
        let html = txt;
        const keywords = ['AI Support Bot', 'AI', 'human takeover', 'order status tracking', 'twenty-nine dollars', 'Boost your store', 'Templates', 'Sync', 'CRM', 'takeover', 'usage limits', 'upgrade'];
        
        keywords.forEach(kw => {
          const regex = new RegExp(`(${kw})`, 'gi');
          html = html.replace(regex, '<span style="color: #ec4899;">$1</span>');
        });
        
        el.innerHTML = html;
        el.style.transform = 'translateX(-50%) scale(1.05)';
        setTimeout(() => {
          el.style.transform = 'translateX(-50%) scale(1)';
        }, 150);
      }
    }, text);
  }

  /**
   * Automate and record a user flow
   * @param {string} flowType Type of user flow ('templates_sync', 'chat_crm', 'billing')
   * @param {string} framesDir Directory to save screenshot frames
   * @param {string} scriptText Optional script copy for reference
   * @returns {Promise<{success: boolean, frameCount: number, duration: number}>}
   */
  async recordFlow(flowType, framesDir, scriptText = '') {
    console.log(`📹 Recording Service: Starting flow recording for "${flowType}"...`);
    
    // Ensure frames directory is clean and exists
    if (fs.existsSync(framesDir)) {
      fs.rmSync(framesDir, { recursive: true, force: true });
    }
    fs.mkdirSync(framesDir, { recursive: true });

    const targetUrl = process.env.TARGET_APP_URL || 'http://localhost:3000';
    const email = process.env.TARGET_APP_EMAIL || 'admin@example.com';
    const password = process.env.TARGET_APP_PASSWORD || 'password123';

    let browser;
    let page;
    let recordingInterval;
    let frameCount = 0;
    const startTime = Date.now();

    try {
      console.log(`📱 Launching Puppeteer browser (Vertical Mobile Viewport)...`);
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      page = await browser.newPage();
      
      // Auto-dismiss all alert/confirm dialogs so they do not block execution
      page.on('dialog', async dialog => {
        console.log(`💬 Dialog popped up: [${dialog.type()}] "${dialog.message()}". Dismissing/Accepting...`);
        await dialog.accept();
      });
      
      // Set viewport dynamically based on flowType
      if (flowType === 'landing_overview') {
        console.log(`💻 Setting viewport to Laptop Widescreen (1280x720)...`);
        await page.setViewport({
          width: 1280,
          height: 720,
          deviceScaleFactor: 1.5
        });
      } else {
        console.log(`📱 Setting viewport to Vertical Mobile (360x640)...`);
        await page.setViewport({
          width: 360,
          height: 640,
          deviceScaleFactor: 2 // High-DPI screen capture for premium quality
        });
      }

      // Start capture loop
      recordingInterval = setInterval(async () => {
        try {
          frameCount++;
          const filename = path.join(framesDir, `frame_${String(frameCount).padStart(4, '0')}.png`);
          await page.screenshot({ path: filename, type: 'png' });
        } catch (err) {
          // Ignore screenshot errors if page is closing/navigating
        }
      }, this.frameInterval);

      if (flowType === 'landing_overview') {
        console.log(`🔗 Navigating directly to main landing page: ${targetUrl}`);
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 15000 });
        await page.waitForTimeout(1000);
        await this.injectCaptionOverlay(page);
      } else {
        // --- Execute Login Flow ---
        console.log(`🔗 Navigating to login page: ${targetUrl}/login`);
        await page.goto(`${targetUrl}/login`, { waitUntil: 'networkidle2', timeout: 15000 });
        
        // Check if we are on the login page or already logged in
        const emailInput = await page.$('input[type="email"]');
        if (emailInput) {
          console.log(`👤 Logging in as ${email}...`);
          await page.type('input[type="email"]', email);
          await page.type('input[type="password"]', password);
          
          console.log(`⌨️ Pressing Enter to submit login...`);
          await page.keyboard.press('Enter');
          
          // Wait for dashboard sidebar/nav to load
          await page.waitForSelector('.sidebar, .nav-links', { timeout: 15000 });
          await page.waitForTimeout(1000);
        } else {
          console.log(`ℹ️ Already logged in or redirecting...`);
        }
        await this.injectCaptionOverlay(page);
      }

      // --- Execute Specific Feature Flow ---
      console.log(`⚙️ Running scenario steps for "${flowType}"...`);
      
      if (flowType === 'landing_overview') {
        // Step 1: Wait on hero section
        await this.setCaption(page, "Welcome to AI Support Bot! 🚀 The ultimate support workspace.");
        console.log(`   Showcasing hero section...`);
        await page.waitForTimeout(3000);

        // Step 2: Smooth scroll to workflows
        await this.setCaption(page, "We train AI on your store policies, FAQs, and order workflows.");
        await this.smoothScrollTo(page, '#workflows', 2000);
        await page.waitForTimeout(3000);

        // Step 3: Smooth scroll to platform depth
        await this.setCaption(page, "Automate order tracking and toggle human takeover when needed.");
        await this.smoothScrollTo(page, '#platform', 2000);
        await page.waitForTimeout(3000);

        // Step 4: Smooth scroll to pricing
        await this.setCaption(page, "Simple pricing starting at $29/mo. Boost your store today! 📈");
        await this.smoothScrollTo(page, '#pricing', 2000);
        await page.waitForTimeout(3000);
      } else if (flowType === 'templates_sync') {
        // Step 1: Go to Templates Dashboard via sidebar
        await this.setCaption(page, "Sync your official Meta WhatsApp templates in 1 click! 🚀");
        console.log(`   Navigating to Templates page...`);
        await this.openSidebar(page);
        await this.clickSidebarLink(page, 'a[href="/dashboard/templates"]');
        await this.closeSidebar(page);

        // Step 2: Click Sync templates
        await this.setCaption(page, "Easily map templates to transactional WooCommerce events.");
        await page.waitForSelector('button.sync-btn', { timeout: 10000 });
        const syncButton = await page.$('button.sync-btn');
        if (syncButton) {
          console.log(`   Clicking Sync Templates button...`);
          await syncButton.click();
          await page.waitForTimeout(4000); // Wait for mock sync load spinner
        }

        // Step 3: Open event mapping selector
        await this.setCaption(page, "Real-time automated alerts keep customers informed 24/7!");
        await page.waitForSelector('select.mapping-select', { timeout: 10000 });
        const selectElement = await page.$('select.mapping-select');
        if (selectElement) {
          console.log(`   Selecting event mapping trigger...`);
          await selectElement.select('order_shipped');
          await page.waitForTimeout(2000);
        }

      } else if (flowType === 'chat_crm') {
        // Step 1: Go to Live Chat page via sidebar
        await this.setCaption(page, "Manage all conversations in our live chat CRM portal! 💬");
        console.log(`   Navigating to Live Chat page...`);
        await this.openSidebar(page);
        await this.clickSidebarLink(page, 'a[href="/dashboard/live-chat"]');
        await this.closeSidebar(page);

        // Step 2: Click first inbox chat item
        await this.setCaption(page, "Want to reply manually? Just toggle the AI override switch.");
        const chatItem = await page.$('.inbox-item, .chat-item');
        if (chatItem) {
          console.log(`   Selecting customer inbox chat...`);
          await chatItem.click();
          await page.waitForTimeout(2000);
        }

        // Step 3: Toggle AI Override button
        await this.setCaption(page, "Take over instantly with full context at your fingertips!");
        const toggleButton = await page.$('.ai-toggle, button.bot-status');
        if (toggleButton) {
          console.log(`   Toggling Agent takeover active...`);
          await toggleButton.click();
          await page.waitForTimeout(2000);
        }

      } else {
        // Default Flow: Billing dashboard overview via sidebar
        await this.setCaption(page, "Monitor active token usage and review SaaS billing limits.");
        console.log(`   Navigating to Billing page...`);
        await this.openSidebar(page);
        await this.clickSidebarLink(page, 'a[href="/dashboard/billing"]');
        await this.closeSidebar(page);
        await page.waitForTimeout(2000);

        await this.setCaption(page, "Upgrade subscription tiers in 1 click via dashboard! 📈");
        await page.waitForTimeout(3000);
      }

      // Complete recording
      clearInterval(recordingInterval);
      await browser.close();

      const durationSec = (Date.now() - startTime) / 1000;
      console.log(`✅ Recording Service: Finished. Captured ${frameCount} frames in ${durationSec.toFixed(1)} seconds.`);
      
      return {
        success: true,
        frameCount,
        duration: durationSec
      };

    } catch (error) {
      console.error('❌ Recording Service Error:', error);
      
      if (page) {
        try {
          const currentUrl = page.url();
          console.log(`🔍 Debug Info: Failed on page URL: ${currentUrl}`);
          console.log(`🔍 Debug Info: Failed page title: ${await page.title()}`);
          const errorScreenshotPath = path.join(__dirname, '../temp/recording_error.png');
          // Ensure temp folder exists
          const tempDir = path.dirname(errorScreenshotPath);
          if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
          await page.screenshot({ path: errorScreenshotPath, fullPage: true });
          console.log(`📸 Saved error debug screenshot to: ${errorScreenshotPath}`);
        } catch (screenshotError) {
          console.error('❌ Failed to capture error screenshot:', screenshotError.message);
        }
      }
      
      if (recordingInterval) clearInterval(recordingInterval);
      if (browser) await browser.close();
      
      return {
        success: false,
        error: error.message,
        frameCount: 0,
        duration: 0
      };
    }
  }
}

// Puppeteer helper workaround for page.waitForTimeout deprecation
if (puppeteer.Page && !puppeteer.Page.prototype.waitForTimeout) {
  puppeteer.Page.prototype.waitForTimeout = function (milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  };
}

module.exports = new RecordingService();
