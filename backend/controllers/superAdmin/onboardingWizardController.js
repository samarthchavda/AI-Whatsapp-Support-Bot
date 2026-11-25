const Admin = require('../../models/Admin');
const PricingPlan = require('../../models/PricingPlan');
const permissionService = require('../../services/permissionService');
const auditLogService = require('../../services/auditLogService');
const emailService = require('../../services/emailService');
const { normalizePlanName } = require('../../config/planConstants');

/**
 * Super Admin Customer Onboarding Wizard Controller
 */
exports.onboardCustomer = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      businessName,
      phoneNumber,
      subscriptionPlan,
      pricingPlanId,
      billingCycle,
      monthlyPrice,
      customDiscount,
      customPermissionProfile,
      allowedPages,
      allowedPermissions,
      deniedPages,
      deniedPermissions,
      geminiTokensLimit,
      isDraft,
      subscriptionStatus,
      sendWelcomeEmail,
      // Step 5 (WhatsApp Setup): saved so the merchant only adds the access token later
      whatsappPhoneNumber,
      wabaId,
      phoneNumberId
    } = req.body;

    // 1. Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Merchant name, email, and initial password are required.'
      });
    }

    const existing = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'A merchant account with this email already exists.'
      });
    }

    // A WhatsApp number can belong to one merchant only (incoming messages are routed by it)
    const cleanPhoneNumberId = phoneNumberId ? String(phoneNumberId).trim() : '';
    if (cleanPhoneNumberId) {
      const { encrypt } = require('../../services/whatsappCredentialService');
      const taken = await Admin.findOne({
        $or: [
          { whatsappPhoneNumberId: encrypt(cleanPhoneNumberId, true) },
          { whatsappPhoneNumberId: cleanPhoneNumberId },
          { 'whatsappConnections.phoneNumberId': cleanPhoneNumberId }
        ]
      }).select('_id');
      if (taken) {
        return res.status(400).json({
          success: false,
          error: 'This WhatsApp Phone Number ID is already connected to another merchant.'
        });
      }
    }

    // 2. Resolve Plan
    let resolvedPlan = null;
    if (pricingPlanId) {
      resolvedPlan = await PricingPlan.findById(pricingPlanId);
    }
    if (!resolvedPlan && subscriptionPlan) {
      const pName = normalizePlanName(subscriptionPlan);
      resolvedPlan = await PricingPlan.findOne({ name: pName }) || await PricingPlan.findOne({ slug: pName });
    }

    const finalPlanName = resolvedPlan ? resolvedPlan.name : (subscriptionPlan ? normalizePlanName(subscriptionPlan) : 'starter');
    const finalMonthlyPrice = monthlyPrice !== undefined ? Number(monthlyPrice) : (resolvedPlan?.monthlyPrice || 1499);
    const finalCycle = billingCycle === 'yearly' ? 'yearly' : 'monthly';
    const finalTokensLimit = geminiTokensLimit !== undefined ? Number(geminiTokensLimit) : (resolvedPlan?.usageLimits?.geminiTokensPerMonth || 50000);

    // 3. Determine Account State
    // Saved statuses must be one the account allows: active, trial, inactive, cancelled.
    // A draft (and a suspended account) is saved as inactive: it can't log in until activated.
    let status = 'active';
    let isActive = true;
    if (isDraft) {
      status = 'inactive';
      isActive = false;
    } else if (subscriptionStatus) {
      const requested = String(subscriptionStatus).toLowerCase();
      status = requested === 'suspended' ? 'inactive' : requested;
      if (!['active', 'trial', 'inactive', 'cancelled'].includes(status)) {
        return res.status(400).json({ success: false, error: `Unknown subscription status "${subscriptionStatus}".` });
      }
      isActive = status !== 'inactive' && status !== 'cancelled';
    }

    const startDate = new Date();
    const endDate = new Date();
    if (finalCycle === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setDate(endDate.getDate() + 30);
    }

    // 4. Create Merchant Admin Record
    const newMerchant = new Admin({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password, // Pre-save hook hashes password
      role: 'admin',
      businessName: businessName ? businessName.trim() : undefined,
      // The account stores the contact number as businessPhone
      businessPhone: phoneNumber ? String(phoneNumber).trim() : undefined,
      subscriptionPlan: finalPlanName,
      pricingPlanId: resolvedPlan?._id || undefined,
      billingCycle: finalCycle,
      subscriptionStatus: status,
      subscriptionStartDate: status === 'active' ? startDate : undefined,
      subscriptionEndDate: status === 'active' ? endDate : undefined,
      monthlyPrice: finalMonthlyPrice,
      customDiscount: customDiscount ? Number(customDiscount) : 0,
      geminiTokensLimit: finalTokensLimit,
      geminiTokensUsed: 0,
      customPermissionProfile: customPermissionProfile || undefined,
      allowedPages: Array.isArray(allowedPages) && allowedPages.length > 0 ? allowedPages : undefined,
      allowedPermissions: Array.isArray(allowedPermissions) && allowedPermissions.length > 0 ? allowedPermissions : undefined,
      deniedPages: Array.isArray(deniedPages) && deniedPages.length > 0 ? deniedPages : undefined,
      deniedPermissions: Array.isArray(deniedPermissions) && deniedPermissions.length > 0 ? deniedPermissions : undefined,
      isActive,
      // WhatsApp details from step 5. Not connected yet: the merchant adds the access
      // token from WhatsApp Connection (or Embedded Signup) after logging in.
      whatsappPhoneNumberId: cleanPhoneNumberId || undefined,
      whatsappBusinessAccountId: wabaId ? String(wabaId).trim() : undefined,
      whatsappDisplayPhoneNumber: whatsappPhoneNumber ? String(whatsappPhoneNumber).trim() : undefined,
      whatsappConnected: false
    });

    await newMerchant.save();

    // 5. Audit Trail Logging
    await auditLogService.logAction({
      action: 'customer_onboarded',
      actor: req.admin,
      target: newMerchant.email,
      details: {
        merchantId: newMerchant._id,
        plan: finalPlanName,
        status,
        draft: Boolean(isDraft),
        whatsappDetailsSaved: Boolean(cleanPhoneNumberId)
      },
      req
    });

    // 6. Optional Welcome / Setup Email Notification
    if (sendWelcomeEmail && emailService && typeof emailService.sendEmail === 'function') {
      try {
        const emailContent = `
          <h2>Welcome to Kwickbot AI, ${name}!</h2>
          <p>Your merchant account has been provisioned by our system administrators.</p>
          <p><strong>Plan:</strong> ${resolvedPlan?.displayName || finalPlanName}</p>
          <p><strong>Status:</strong> ${status.toUpperCase()}</p>
          <p>You can now log in to access your merchant dashboard.</p>
        `;
        await emailService.sendEmail({
          to: newMerchant.email,
          subject: 'Your Kwickbot AI Account is Ready',
          html: emailContent
        });
      } catch (mailErr) {
        console.error('Failed to send onboarding welcome email:', mailErr.message);
      }
    }

    // 7. Compute effective access for response payload
    const effectiveAccess = await permissionService.getEffectiveAccessPayload(newMerchant);

    res.status(201).json({
      success: true,
      message: isDraft
        ? 'Saved as a draft: the account is inactive until you activate it from the merchant page'
        : 'Customer onboarded and activated successfully',
      data: {
        merchant: {
          _id: newMerchant._id,
          name: newMerchant.name,
          email: newMerchant.email,
          role: newMerchant.role,
          subscriptionPlan: newMerchant.subscriptionPlan,
          subscriptionStatus: newMerchant.subscriptionStatus,
          monthlyPrice: newMerchant.monthlyPrice,
          isActive: newMerchant.isActive,
          createdAt: newMerchant.createdAt
        },
        effectiveAccess: effectiveAccess.data
      }
    });
  } catch (error) {
    console.error('Error onboarding customer:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to complete customer onboarding'
    });
  }
};
