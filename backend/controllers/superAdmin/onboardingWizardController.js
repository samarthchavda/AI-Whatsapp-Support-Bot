const Admin = require('../../models/Admin');
const PricingPlan = require('../../models/PricingPlan');
const CRMConnection = require('../../models/CRMConnection');
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
      // Optional initial CRM Connection
      crmProvider,
      crmApiUrl,
      crmApiKey,
      crmDatabase,
      crmUsername
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
    let status = 'active';
    let isActive = true;
    if (isDraft) {
      status = 'draft';
      isActive = false;
    } else if (subscriptionStatus) {
      status = subscriptionStatus;
      isActive = subscriptionStatus !== 'inactive' && subscriptionStatus !== 'suspended';
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
      phoneNumber: phoneNumber ? phoneNumber.trim() : undefined,
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
      whatsappConnected: false
    });

    await newMerchant.save();

    // 5. Initial CRM Connection Provisioning (if details provided)
    let createdCrmConnection = null;
    if (crmProvider && (crmApiUrl || crmApiKey)) {
      try {
        createdCrmConnection = new CRMConnection({
          merchantId: newMerchant._id,
          provider: crmProvider,
          name: `${name}'s ${crmProvider.toUpperCase()} Connection`,
          apiUrl: crmApiUrl || '',
          apiKey: crmApiKey || '',
          database: crmDatabase || '',
          username: crmUsername || '',
          connectionStatus: 'pending',
          syncDirection: 'bi-directional'
        });
        await createdCrmConnection.save();
      } catch (crmErr) {
        console.error('Failed to create initial CRM Connection during onboarding:', crmErr);
      }
    }

    // 6. Audit Trail Logging
    await auditLogService.logAction(
      req.admin?.email || 'super_admin',
      'customer_onboarded',
      {
        merchantId: newMerchant._id,
        email: newMerchant.email,
        plan: finalPlanName,
        status,
        hasCrmConfig: Boolean(createdCrmConnection)
      }
    );

    // 7. Optional Welcome / Setup Email Notification
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

    // 8. Compute effective access for response payload
    const effectiveAccess = await permissionService.getEffectiveAccessPayload(newMerchant);

    res.status(201).json({
      success: true,
      message: isDraft ? 'Customer draft saved successfully' : 'Customer onboarded and activated successfully',
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
        crmConnection: createdCrmConnection,
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
