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
      // Prioritize referer header over origin to get the exact active page URL path
      const rawUri = redirectUri || req.headers.referer || req.headers.origin || 'https://kwickbot.in';
      const urlObj = new URL(rawUri);
      finalRedirectUri = `${urlObj.origin}/`;
    } catch (urlErr) {
      console.warn('⚠️ URL parsing failed for redirectUri, falling back to origin header:', urlErr.message);
      const origin = req.headers.origin || 'https://kwickbot.in';
      finalRedirectUri = origin.endsWith('/') ? origin : `${origin}/`;
    }

    console.log(`📡 Using initial exchange redirect_uri: ${finalRedirectUri}`);
    
    let tokenResponse;
    try {
      tokenResponse = await axios.get('https://graph.facebook.com/v25.0/oauth/access_token', {
        params: {
          client_id: appId,
          client_secret: appSecret,
          code: code,
          redirect_uri: finalRedirectUri
        }
      });
    } catch (err) {
      const isRedirectUriError = err.response?.data?.error?.error_subcode === 36008 || err.response?.data?.error?.code === 100;
      if (isRedirectUriError) {
        // Swap domain format (add/remove www) and try alternate root URL
        let alternateUri;
        if (finalRedirectUri.includes('https://www.')) {
          alternateUri = finalRedirectUri.replace('https://www.', 'https://');
        } else {
          alternateUri = finalRedirectUri.replace('https://', 'https://www.');
        }
        
        console.log(`🔄 Meta redirect URI mismatch (36008). Retrying with alternate redirect_uri: ${alternateUri}`);
        try {
          tokenResponse = await axios.get('https://graph.facebook.com/v25.0/oauth/access_token', {
            params: {
              client_id: appId,
              client_secret: appSecret,
              code: code,
              redirect_uri: alternateUri
            }
          });
        } catch (altErr) {
          const isAltRedirectUriError = altErr.response?.data?.error?.error_subcode === 36008 || altErr.response?.data?.error?.code === 100;
          if (isAltRedirectUriError) {
            // Try with an empty string redirect_uri (standard fallback for JS SDK)
            console.log(`🔄 Alternate root URL failed. Retrying with empty string redirect_uri...`);
            try {
              tokenResponse = await axios.get('https://graph.facebook.com/v25.0/oauth/access_token', {
                params: {
                  client_id: appId,
                  client_secret: appSecret,
                  code: code,
                  redirect_uri: ""
                }
              });
            } catch (emptyErr) {
              const isEmptyRedirectUriError = emptyErr.response?.data?.error?.error_subcode === 36008 || emptyErr.response?.data?.error?.code === 100;
              if (isEmptyRedirectUriError) {
                // Try omitting redirect_uri completely
                console.log(`🔄 Empty string redirect_uri failed. Retrying with omitted redirect_uri parameter...`);
                try {
                  tokenResponse = await axios.get('https://graph.facebook.com/v25.0/oauth/access_token', {
                    params: {
                      client_id: appId,
                      client_secret: appSecret,
                      code: code
                    }
                  });
                } catch (omitErr) {
                  const isOmitRedirectUriError = omitErr.response?.data?.error?.error_subcode === 36008 || omitErr.response?.data?.error?.code === 100;
                  if (isOmitRedirectUriError) {
                    // Final fallback: try using the original full page URL path
                    const fullUriFallback = redirectUri || req.headers.referer || 'https://kwickbot.in/dashboard/whatsapp-connect';
                    console.log(`🔄 Omitted redirect_uri failed. Retrying with full page URL fallback redirect_uri: ${fullUriFallback}`);
                    tokenResponse = await axios.get('https://graph.facebook.com/v25.0/oauth/access_token', {
                      params: {
                        client_id: appId,
                        client_secret: appSecret,
                        code: code,
                        redirect_uri: fullUriFallback
                      }
                    });
                  } else {
                    throw omitErr;
                  }
                }
              } else {
                throw emptyErr;
              }
            }
          } else {
            throw altErr;
          }
        }
      } else {
        throw err;
      }
    }

    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) {
      throw new Error('No access token returned from Meta');
    }

    console.log(`✅ Access Token retrieved successfully: ${maskSecret(accessToken)}. Fetching WABA details...`);

    // 2. Retrieve WhatsApp Business Account (WABA) details
    let targetWabaId = req.body.wabaId || null;
    let targetPhoneNumberId = req.body.phoneNumberId || null;
    let wabaName = 'WhatsApp Business Account';
    let businessId = null;

    // Strategy A: Inspect debug_token to extract target_ids from granular_scopes
    if (!targetWabaId) {
      try {
        console.log(`🤖 Inspecting access token via debug_token for WABA target IDs...`);
        const debugResponse = await axios.get('https://graph.facebook.com/v25.0/debug_token', {
          params: {
            input_token: accessToken,
            access_token: `${appId}|${appSecret}`
          }
        });

        const granularScopes = debugResponse.data?.data?.granular_scopes || [];
        for (const scopeObj of granularScopes) {
          if (scopeObj.scope === 'whatsapp_business_management' || scopeObj.scope === 'whatsapp_business_messaging') {
            if (scopeObj.target_ids && scopeObj.target_ids.length > 0) {
              targetWabaId = scopeObj.target_ids[0];
              console.log(`✅ Extracted WABA ID from debug_token granular_scopes: ${targetWabaId}`);
              break;
            }
          }
        }
      } catch (debugErr) {
        console.warn(`⚠️ debug_token inspection failed: ${debugErr.message}`);
      }
    }

    // Strategy B: Fallback to direct /me/whatsapp_business_accounts or /me/businesses if still not found
    if (!targetWabaId) {
      try {
        console.log(`🤖 Attempting to fetch WABAs directly via /me/whatsapp_business_accounts...`);
        const wabaResponse = await axios.get('https://graph.facebook.com/v25.0/me/whatsapp_business_accounts', {
          params: { access_token: accessToken }
        });
        const list = wabaResponse.data?.data || [];
        if (list.length > 0) {
          targetWabaId = list[0].id;
          wabaName = list[0].name || wabaName;
          businessId = list[0].owner_business_info?.id || null;
        }
      } catch (directErr) {
        console.warn(`⚠️ Direct WABA fetch failed: ${directErr.message}. Trying fallback /me/businesses...`);
        try {
          const businessesResponse = await axios.get('https://graph.facebook.com/v25.0/me/businesses', {
            params: { access_token: accessToken }
          });
          const businessList = businessesResponse.data?.data || [];
          for (const biz of businessList) {
            try {
              const bizWabaResponse = await axios.get(`https://graph.facebook.com/v25.0/${biz.id}/owned_whatsapp_business_accounts`, {
                params: { access_token: accessToken }
              });
              const bizWabas = bizWabaResponse.data?.data || [];
              if (bizWabas.length > 0) {
                targetWabaId = bizWabas[0].id;
                wabaName = bizWabas[0].name || wabaName;
                businessId = biz.id;
                break;
              }
            } catch (bErr) {
              // ignore
            }
          }
        } catch (fErr) {
          console.error(`❌ Fallback business fetch failed: ${fErr.message}`);
        }
      }
    }

    if (!targetWabaId) {
      return res.status(400).json({
        success: false,
        error: 'Could not determine WhatsApp Business Account ID from Meta. Please ensure you have selected a WABA during signup.'
      });
    }

    // Fetch WABA details directly using targetWabaId
    try {
      const wabaInfoResponse = await axios.get(`https://graph.facebook.com/v25.0/${targetWabaId}`, {
        params: { access_token: accessToken }
      });
      wabaName = wabaInfoResponse.data?.name || wabaName;
      businessId = wabaInfoResponse.data?.owner_business_info?.id || businessId;
    } catch (infoErr) {
      console.warn(`⚠️ Could not fetch WABA name details for ${targetWabaId}: ${infoErr.message}`);
    }

    console.log(`✅ Using WABA: ${wabaName} (${targetWabaId}). Fetching phone numbers...`);

    // 3. Retrieve Phone Numbers associated with the target WABA
    const phoneResponse = await axios.get(`https://graph.facebook.com/v25.0/${targetWabaId}/phone_numbers`, {
      params: { access_token: accessToken }
    });

    const phoneList = phoneResponse.data?.data || [];
    if (phoneList.length === 0) {
      return res.status(400).json({
        success: false,
        error: `Found WhatsApp Business Account (${targetWabaId}) but no registered phone numbers were returned by Meta.`
      });
    }

    const phoneInfo = phoneList.find(p => p.id === targetPhoneNumberId) || phoneList[0];
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
    admin.whatsappBusinessAccountId = targetWabaId;
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
      console.log(`🔗 Subscribing Kwickbot Webhook app to WABA ID: ${targetWabaId}`);
      await axios.post(
        `https://graph.facebook.com/v25.0/${targetWabaId}/subscribed_apps`,
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
        wabaId: targetWabaId,
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
