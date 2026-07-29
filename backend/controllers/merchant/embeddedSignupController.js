const axios = require('axios');
const Admin = require('../../models/Admin');

// Helper to mask secrets in logs
const maskSecret = (secret) => {
  if (!secret) return 'N/A';
  if (secret.length <= 8) return '••••••••';
  return `${secret.substring(0, 6)}...${secret.substring(secret.length - 4)}`;
};

exports.handleEmbeddedSignup = async (req, res) => {
  try {
    const { code, redirectUri } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is required'
      });
    }

    const appId = process.env.META_APP_ID || '968921106124424';
    const appSecret = process.env.META_CLIENT_SECRET;

    if (!appSecret) {
      console.error('❌ Meta Client Secret is missing from environment variables.');
      return res.status(500).json({
        success: false,
        error: 'Meta Client Secret is not configured in backend environment variables (.env)'
      });
    }

    console.log(`🔑 Exchanging auth code for access token for App ID: ${appId} (code: ${maskSecret(code)})`);

    // 1. Exchange authorization code for access token
    // The Meta JS SDK always uses the domain's root origin with a trailing slash (e.g. "https://kwickbot.in/") as the dialog redirect_uri.
    let finalRedirectUri = 'https://kwickbot.in/';
    try {
      const rawUri = redirectUri || req.headers.origin || 'https://kwickbot.in';
      const urlObj = new URL(rawUri);
      finalRedirectUri = `${urlObj.origin}/`;
    } catch (urlErr) {
      console.warn('⚠️ URL parsing failed for redirectUri, falling back to header:', urlErr.message);
      const origin = req.headers.origin || 'https://kwickbot.in';
      finalRedirectUri = origin.endsWith('/') ? origin : `${origin}/`;
    }
    console.log(`📡 Using exchange redirect_uri: ${finalRedirectUri}`);
    
    const tokenResponse = await axios.get('https://graph.facebook.com/v25.0/oauth/access_token', {
      params: {
        client_id: appId,
        client_secret: appSecret,
        code: code,
        redirect_uri: finalRedirectUri
      }
    });

    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) {
      throw new Error('No access token returned from Meta');
    }

    console.log(`✅ Access Token retrieved successfully: ${maskSecret(accessToken)}. Fetching WABA details...`);

    // 2. Retrieve WhatsApp Business Account (WABA) details
    const wabaResponse = await axios.get('https://graph.facebook.com/v25.0/me/whatsapp_business_accounts', {
      params: {
        access_token: accessToken
      }
    });

    const wabaList = wabaResponse.data.data;
    if (!wabaList || wabaList.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No WhatsApp Business Accounts found linked to this Facebook account.'
      });
    }

    const linkedWaba = wabaList[0];
    const wabaId = linkedWaba.id;
    const wabaName = linkedWaba.name;
    const businessId = linkedWaba.owner_business_info?.id || null;

    console.log(`✅ Found WABA: ${wabaName} (${wabaId}), Business Owner ID: ${businessId || 'N/A'}. Fetching phone numbers...`);

    // 3. Retrieve Phone Numbers associated with the WABA
    const phoneResponse = await axios.get(`https://graph.facebook.com/v25.0/${wabaId}/phone_numbers`, {
      params: {
        access_token: accessToken
      }
    });

    const phoneList = phoneResponse.data.data;
    if (!phoneList || phoneList.length === 0) {
      return res.status(400).json({
        success: false,
        error: `Found WhatsApp Business Account ${wabaName} but no phone numbers are linked to it.`
      });
    }

    const phoneInfo = phoneList[0];
    const phoneNumberId = phoneInfo.id;
    const displayPhoneNumber = phoneInfo.display_phone_number || '';
    const verifiedName = phoneInfo.verified_name || '';

    console.log(`✅ Found Phone Number: ${displayPhoneNumber} (ID: ${phoneNumberId})`);

    // 4. Save credentials securely to the Admin profile
    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Merchant admin user not found'
      });
    }

    admin.whatsappAccessToken = accessToken;
    admin.whatsappPhoneNumberId = phoneNumberId;
    admin.whatsappBusinessAccountId = wabaId;
    admin.whatsappBusinessId = businessId;
    admin.whatsappAppId = appId;
    admin.whatsappDisplayPhoneNumber = displayPhoneNumber;
    admin.whatsappBusinessName = verifiedName || wabaName;
    admin.whatsappStatus = 'connected';
    admin.whatsappConnected = true;
    admin.whatsappConnectedAt = new Date();

    await admin.save();
    console.log(`🔒 Securely stored encrypted WhatsApp credentials for Merchant Admin ID: ${admin._id}`);

    // 5. Automatically register/subscribe webhook apps to the WABA
    try {
      console.log(`🔗 Subscribing Kwickbot Webhook app to WABA ID: ${wabaId}`);
      await axios.post(
        `https://graph.facebook.com/v25.0/${wabaId}/subscribed_apps`,
        {},
        {
          params: {
            access_token: accessToken
          }
        }
      );
      console.log('✅ Webhook subscription registered successfully!');
    } catch (subErr) {
      console.error('⚠️ Webhook subscription warning (non-blocking):', subErr.response?.data || subErr.message);
    }

    res.json({
      success: true,
      message: 'WhatsApp Business API connected successfully via Embedded Signup!',
      data: {
        displayName: verifiedName || wabaName,
        phoneNumber: displayPhoneNumber,
        wabaId,
        phoneNumberId,
        businessId
      }
    });

  } catch (error) {
    console.error('❌ Error during Meta Embedded Signup exchange:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message || 'Failed to exchange credentials with Meta'
    });
  }
};
