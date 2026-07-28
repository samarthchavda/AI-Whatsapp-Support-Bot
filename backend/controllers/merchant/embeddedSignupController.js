const axios = require('axios');
const Admin = require('../../models/Admin');

exports.handleEmbeddedSignup = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is required'
      });
    }

    const appId = process.env.META_APP_ID || '968921106124424';
    const appSecret = process.env.META_CLIENT_SECRET;

    if (!appSecret) {
      return res.status(500).json({
        success: false,
        error: 'Meta Client Secret is not configured in backend environment variables (.env)'
      });
    }

    console.log(`🔑 Exchanging auth code for access token for App ID: ${appId}`);

    // 1. Exchange the authorization code for an Access Token
    // We use the redirect_uri of the frontend or origin. Meta requires it to be identical to the one used in the popup.
    const tokenResponse = await axios.get('https://graph.facebook.com/v25.0/oauth/access_token', {
      params: {
        client_id: appId,
        client_secret: appSecret,
        code: code,
        redirect_uri: req.headers.origin || 'https://kwickbot.in'
      }
    });

    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) {
      throw new Error('No access token returned from Meta');
    }

    console.log('✅ Access Token retrieved successfully. Fetching WhatsApp Business Account details...');

    // 2. Retrieve the WhatsApp Business Account (WABA) linked to this token
    const wabaResponse = await axios.get('https://graph.facebook.com/v25.0/me/whatsapp_business_accounts', {
      params: {
        access_token: accessToken
      }
    });

    const wabaList = wabaResponse.data.data;
    if (!wabaList || wabaList.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No WhatsApp Business Accounts found linked to this Facebook login. Please verify the WhatsApp account is setup.'
      });
    }

    // Select the first active/approved WABA (usually there is only one for normal signups)
    const linkedWaba = wabaList[0];
    const wabaId = linkedWaba.id;
    const wabaName = linkedWaba.name;

    console.log(`✅ Found WABA: ${wabaName} (${wabaId}). Fetching Phone Numbers...`);

    // 3. Retrieve the Phone Numbers associated with this WABA
    const phoneResponse = await axios.get(`https://graph.facebook.com/v25.0/${wabaId}/phone_numbers`, {
      params: {
        access_token: accessToken
      }
    });

    const phoneList = phoneResponse.data.data;
    if (!phoneList || phoneList.length === 0) {
      return res.status(400).json({
        success: false,
        error: `Found WhatsApp Business Account ${wabaName} but no phone numbers are linked to it yet.`
      });
    }

    // Select the first verified phone number or first available
    const phoneInfo = phoneList[0];
    const phoneNumberId = phoneInfo.id;
    const displayPhoneNumber = phoneInfo.display_phone_number || '';
    const verifiedName = phoneInfo.verified_name || '';

    console.log(`✅ Linked Phone Number: ${displayPhoneNumber} (ID: ${phoneNumberId})`);

    // 4. Save credentials to current logged-in Admin merchant profile
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
    admin.whatsappStatus = 'connected';
    
    await admin.save();

    // 5. Automatically register/subscribe webhook apps to the WABA
    try {
      console.log(`🔗 Subscribing Kwickbot Webhook app to WABA: ${wabaId}`);
      await axios.post(
        `https://graph.facebook.com/v25.0/${wabaId}/subscribed_apps`,
        {},
        {
          params: {
            access_token: accessToken
          }
        }
      );
      console.log('✅ Webhook subscription activated successfully!');
    } catch (subErr) {
      console.error('⚠️ Webhook subscription warning (ignoring to avoid failing login):', subErr.response?.data || subErr.message);
    }

    res.json({
      success: true,
      message: 'WhatsApp Business API connected successfully via Embedded Signup!',
      data: {
        displayName: verifiedName || wabaName,
        phoneNumber: displayPhoneNumber,
        wabaId,
        phoneNumberId
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
