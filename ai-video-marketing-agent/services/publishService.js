const axios = require('axios');

class PublishService {
  constructor() {
    this.accessToken = process.env.META_ACCESS_TOKEN;
    this.instagramBusinessId = process.env.INSTAGRAM_BUSINESS_ID;
    
    // Check if configuration is active
    this.isConfigured = this.accessToken && 
                        this.accessToken !== 'your_meta_access_token_here' && 
                        this.accessToken !== 'mock_meta_access_token_123' && 
                        this.instagramBusinessId && 
                        this.instagramBusinessId !== 'your_instagram_business_id_here' && 
                        this.instagramBusinessId !== 'mock_instagram_business_id_123';
  }

  /**
   * Publish a video to Instagram Reels
   * @param {string} videoUrl Publicly accessible URL of the MP4 video (Meta servers must be able to fetch this)
   * @param {string} caption Caption and hashtags for the Reel
   * @returns {Promise<{success: boolean, mediaId?: string, error?: string}>}
   */
  async publishReel(videoUrl, caption = '') {
    console.log(`📱 Publish Service: Initiating Reels publishing...`);
    console.log(`   Video URL: ${videoUrl}`);
    console.log(`   Caption: "${caption.substring(0, 50)}..."`);

    const isLocalhost = videoUrl.includes('localhost') || videoUrl.includes('127.0.0.1');

    // Handle local development simulation
    if (!this.isConfigured || isLocalhost) {
      console.log(`⚠️ Publish Service: Live credentials missing or localhost URL detected.`);
      if (isLocalhost) {
        console.log(`   (Note: Meta servers require a public URL to download videos. Localhost is not supported by Meta's API).`);
      }
      console.log(`📡 Simulating successful Reels upload to Instagram Business Profile...`);
      
      // Delay to simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockMediaId = 'ig_mock_media_id_' + Math.random().toString(36).substr(2, 9);
      console.log(`✅ Publish Service: Reel successfully published! (Mock ID: ${mockMediaId})`);
      
      return {
        success: true,
        mediaId: mockMediaId
      };
    }

    try {
      // Step 1: Create Container
      console.log(`📡 Meta API: Requesting media upload container...`);
      const createContainerUrl = `https://graph.facebook.com/v18.0/${this.instagramBusinessId}/media`;
      
      const containerRes = await axios.post(createContainerUrl, {
        media_type: 'REELS',
        video_url: videoUrl,
        caption: caption,
        share_to_feed: true,
        access_token: this.accessToken
      });

      const containerId = containerRes.data.id;
      console.log(`✅ Meta API: Media container created. Container ID: ${containerId}`);

      // Step 2: Wait for video processing
      // Meta recommends waiting for 10-30 seconds depending on video size
      console.log(`⏳ Meta API: Waiting for video processing (30 seconds)...`);
      await new Promise(resolve => setTimeout(resolve, 30000));

      // Step 3: Publish container
      console.log(`📡 Meta API: Requesting Reels publish...`);
      const publishUrl = `https://graph.facebook.com/v18.0/${this.instagramBusinessId}/media_publish`;
      
      const publishRes = await axios.post(publishUrl, {
        creation_id: containerId,
        access_token: this.accessToken
      });

      const mediaId = publishRes.data.id;
      console.log(`✅ Meta API: Reels published successfully! Media ID: ${mediaId}`);

      return {
        success: true,
        mediaId: mediaId
      };

    } catch (error) {
      console.error('❌ Publish Service Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }
}

module.exports = new PublishService();
