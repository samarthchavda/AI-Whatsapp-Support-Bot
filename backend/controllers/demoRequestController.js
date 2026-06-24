const DemoRequest = require('../models/DemoRequest');
const emailService = require('../services/emailService');
const { getFrontendUrl } = require('../services/urlHelper');

// Create a new demo request
exports.createDemoRequest = async (req, res) => {
  try {
    const { name, email, phone, businessName, businessDetails, websiteUrl } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !businessName || !businessDetails || !websiteUrl) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Check if email already has a pending request
    const existingRequest = await DemoRequest.findOne({ 
      email, 
      status: 'pending' 
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending demo request. We will contact you soon!'
      });
    }

    // Create new demo request
    const demoRequest = new DemoRequest({
      name,
      email,
      phone,
      businessName,
      businessDetails,
      websiteUrl
    });

    await demoRequest.save();

    // Send email notifications
    try {
      // 1. Send confirmation email to Customer
      const customerHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Inter', Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 700; }
            .content { padding: 40px; }
            .content h2 { color: #1f2937; font-size: 24px; margin-bottom: 16px; }
            .content p { color: #6b7280; line-height: 1.6; margin-bottom: 16px; }
            .details { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 24px 0; }
            .details-item { margin-bottom: 10px; font-size: 15px; }
            .details-label { font-weight: 600; color: #4b5563; }
            .details-value { color: #1f2937; }
            .footer { background: #f9fafb; padding: 24px; text-align: center; color: #9ca3af; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Demo Request Received</h1>
            </div>
            <div class="content">
              <h2>Hi ${name},</h2>
              <p>Thank you for your interest in Kwickbot! We have successfully received your request for a personalized demo.</p>
              <p>Our team will contact you within the next 24 hours to schedule the demo and show you how Kwickbot can transform your customer service.</p>
              
              <div class="details">
                <h3 style="margin-top: 0; color: #1f2937; font-size: 16px;">Submitted Details:</h3>
                <div class="details-item">
                  <span class="details-label">Business Name:</span>
                  <span class="details-value">${businessName}</span>
                </div>
                <div class="details-item">
                  <span class="details-label">Phone Number:</span>
                  <span class="details-value">${phone}</span>
                </div>
                <div class="details-item">
                  <span class="details-label">Website URL:</span>
                  <span class="details-value">${websiteUrl}</span>
                </div>
              </div>
              
              <p>In the meantime, feel free to reply to this email if you have any immediate questions.</p>
              <p>Best regards,<br><strong>Kwickbot Team</strong></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Kwickbot. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const customerText = `Hello ${name},\n\nThank you for your interest in Kwickbot! We have successfully received your request for a personalized demo.\n\nOur team will contact you within the next 24 hours to schedule the demo.\n\nSubmitted Details:\n- Business Name: ${businessName}\n- Phone Number: ${phone}\n- Website URL: ${websiteUrl}\n\nBest regards,\nKwickbot Team`;

      await emailService.sendEmail({
        to: email,
        subject: 'Demo Request Received - Kwickbot',
        html: customerHtml,
        text: customerText
      });

      // 2. Send notification email to Admin / Escalation
      const adminRecipient = process.env.ESCALATION_EMAIL || process.env.SMTP_USER;
      const adminHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Inter', Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }
            .header { background: #1f2937; padding: 30px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 700; }
            .content { padding: 40px; }
            .details { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 24px 0; }
            .details-item { margin-bottom: 12px; font-size: 15px; border-bottom: 1px solid #f3f4f6; padding-bottom: 8px; }
            .details-item:last-child { border-bottom: none; padding-bottom: 0; }
            .details-label { font-weight: 600; color: #4b5563; display: block; margin-bottom: 4px; }
            .details-value { color: #1f2937; white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Lead: Demo Request</h1>
            </div>
            <div class="content">
              <p>A new demo request has been submitted on Kwickbot website. Here are the details:</p>
              
              <div class="details">
                <div class="details-item">
                  <span class="details-label">Full Name:</span>
                  <span class="details-value">${name}</span>
                </div>
                <div class="details-item">
                  <span class="details-label">Email Address:</span>
                  <span class="details-value">${email}</span>
                </div>
                <div class="details-item">
                  <span class="details-label">Phone Number:</span>
                  <span class="details-value">${phone}</span>
                </div>
                <div class="details-item">
                  <span class="details-label">Business Name:</span>
                  <span class="details-value">${businessName}</span>
                </div>
                <div class="details-item">
                  <span class="details-label">Business Details / Challenges:</span>
                  <span class="details-value">${businessDetails}</span>
                </div>
                <div class="details-item">
                  <span class="details-label">Website URL:</span>
                  <span class="details-value"><a href="${websiteUrl.startsWith('http') ? websiteUrl : 'https://' + websiteUrl}" target="_blank" style="color: #4f46e5; text-decoration: underline;">${websiteUrl}</a></span>
                </div>
              </div>
              
              <p style="text-align: center; margin-top: 30px;">
                <a href="${getFrontendUrl(req)}/super-admin" style="background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Open Super Admin Dashboard</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const adminText = `A new demo request has been submitted on the Kwickbot website.\n\nDetails:\n- Full Name: ${name}\n- Email: ${email}\n- Phone: ${phone}\n- Business Name: ${businessName}\n- Website URL: ${websiteUrl}\n- Business Details: ${businessDetails}`;

      await emailService.sendEmail({
        to: adminRecipient,
        subject: `New Demo Request from ${businessName}`,
        html: adminHtml,
        text: adminText,
        from: `"Kwickbot System" <${process.env.SMTP_USER}>`
      });
    } catch (emailErr) {
      console.error('❌ Error sending demo request emails:', emailErr);
    }

    res.status(201).json({
      success: true,
      message: 'Demo request submitted successfully! We will contact you within 24 hours.',
      data: {
        id: demoRequest._id,
        name: demoRequest.name,
        email: demoRequest.email
      }
    });
  } catch (error) {
    console.error('Error creating demo request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit demo request',
      error: error.message
    });
  }
};

// Get all demo requests (admin only)
exports.getAllDemoRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }

    const demoRequests = await DemoRequest.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await DemoRequest.countDocuments(query);

    res.json({
      success: true,
      data: demoRequests,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    console.error('Error fetching demo requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch demo requests',
      error: error.message
    });
  }
};

// Update demo request status (admin only)
exports.updateDemoRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const demoRequest = await DemoRequest.findById(id);

    if (!demoRequest) {
      return res.status(404).json({
        success: false,
        message: 'Demo request not found'
      });
    }

    if (status) {
      demoRequest.status = status;
      if (status === 'contacted' && !demoRequest.contactedAt) {
        demoRequest.contactedAt = new Date();
      }
    }

    if (notes !== undefined) {
      demoRequest.notes = notes;
    }

    await demoRequest.save();

    res.json({
      success: true,
      message: 'Demo request updated successfully',
      data: demoRequest
    });
  } catch (error) {
    console.error('Error updating demo request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update demo request',
      error: error.message
    });
  }
};

// Delete demo request (admin only)
exports.deleteDemoRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const demoRequest = await DemoRequest.findByIdAndDelete(id);

    if (!demoRequest) {
      return res.status(404).json({
        success: false,
        message: 'Demo request not found'
      });
    }

    res.json({
      success: true,
      message: 'Demo request deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting demo request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete demo request',
      error: error.message
    });
  }
};

// Approve demo request and create admin account
exports.approveDemoRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { subscriptionPlan = 'starter', monthlyPrice = 2999, geminiTokens = 10000 } = req.body;

    const demoRequest = await DemoRequest.findById(id);

    if (!demoRequest) {
      return res.status(404).json({
        success: false,
        message: 'Demo request not found'
      });
    }

    if (demoRequest.approved) {
      return res.status(400).json({
        success: false,
        message: 'This demo request has already been approved'
      });
    }

    // Check if admin with this email already exists
    const Admin = require('../models/Admin');
    const existingAdmin = await Admin.findOne({ email: demoRequest.email });

    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    // Generate random password
    const crypto = require('crypto');
    const generatedPassword = crypto.randomBytes(8).toString('hex').slice(0, 12);

    // Create admin account
    const newAdmin = new Admin({
      name: demoRequest.name,
      email: demoRequest.email,
      password: generatedPassword,
      phone: demoRequest.phone,
      businessName: demoRequest.businessName,
      role: 'admin',
      subscriptionPlan: subscriptionPlan.toLowerCase(),
      subscriptionStatus: 'trial',
      monthlyPrice,
      geminiTokens,
      isActive: true
    });

    await newAdmin.save();

    // Update demo request
    demoRequest.approved = true;
    demoRequest.approvedBy = req.admin._id;
    demoRequest.approvedAt = new Date();
    demoRequest.status = 'approved';
    demoRequest.adminCreated = true;
    demoRequest.createdAdminId = newAdmin._id;
    demoRequest.generatedPassword = generatedPassword; // Store temporarily for email
    await demoRequest.save();

    // Send email with credentials
    try {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Inter', Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 700; }
            .content { padding: 40px; }
            .content h2 { color: #1f2937; font-size: 24px; margin-bottom: 16px; }
            .content p { color: #6b7280; line-height: 1.6; margin-bottom: 16px; }
            .credentials { background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 12px; padding: 24px; margin: 24px 0; }
            .credentials h3 { color: #1f2937; font-size: 18px; margin-bottom: 16px; }
            .credential-item { margin-bottom: 12px; }
            .credential-label { color: #6b7280; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
            .credential-value { color: #1f2937; font-size: 16px; font-weight: 700; margin-top: 4px; background: white; padding: 12px; border-radius: 8px; border: 1px solid #e5e7eb; }
            .button { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; margin: 24px 0; }
            .footer { background: #f9fafb; padding: 24px; text-align: center; color: #9ca3af; font-size: 14px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 8px; }
            .warning p { color: #92400e; margin: 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Kwickbot!</h1>
            </div>
            <div class="content">
              <h2>Hi ${demoRequest.name},</h2>
              <p>Great news! Your demo request has been approved. We've created your account and you can now access the Kwickbot dashboard.</p>
              
              <div class="credentials">
                <h3>🔐 Your Login Credentials</h3>
                <div class="credential-item">
                  <div class="credential-label">Email</div>
                  <div class="credential-value">${demoRequest.email}</div>
                </div>
                <div class="credential-item">
                  <div class="credential-label">Password</div>
                  <div class="credential-value">${generatedPassword}</div>
                </div>
                <div class="credential-item">
                  <div class="credential-label">Subscription Plan</div>
                  <div class="credential-value">${subscriptionPlan}</div>
                </div>
              </div>

              <div class="warning">
                <p><strong>⚠️ Important:</strong> Please change your password after your first login for security purposes.</p>
              </div>

              <a href="${getFrontendUrl(req)}/login" class="button">Login to Dashboard</a>

              <p><strong>What's Next?</strong></p>
              <ul style="color: #6b7280; line-height: 1.8;">
                <li>Login to your dashboard using the credentials above</li>
                <li>Connect your WhatsApp Business account</li>
                <li>Configure your AI bot settings</li>
                <li>Start automating customer support!</li>
              </ul>

              <p>If you have any questions or need assistance, feel free to reach out to our support team.</p>
              
              <p style="margin-top: 32px;">Best regards,<br><strong>Kwickbot Team</strong></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Kwickbot. All rights reserved.</p>
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const emailText = `Hi ${demoRequest.name},\n\nGreat news! Your demo request has been approved. We've created your account and you can now access the Kwickbot dashboard.\n\nYour Login Credentials:\n- Email: ${demoRequest.email}\n- Password: ${generatedPassword}\n- Subscription Plan: ${subscriptionPlan}\n\nImportant: Please change your password after your first login for security purposes.\n\nLogin to Dashboard here: ${getFrontendUrl(req)}/login\n\nBest regards,\nKwickbot Team`;

      await emailService.sendEmail({
        to: demoRequest.email,
        subject: 'Your Kwickbot Account is Ready',
        html: emailHtml,
        text: emailText
      });
      console.log(`✅ Welcome email sent to ${demoRequest.email}`);
    } catch (emailError) {
      console.error('❌ Error sending email:', emailError);
      // Don't fail the request if email fails
    }

    // Send WhatsApp notification with credentials
    try {
      const whatsappMessage = `🎉 *Congratulations!* Your Kwickbot account has been approved.

Here are your login credentials:
📧 *Email:* ${demoRequest.email}
🔑 *Password:* ${generatedPassword}

Please log in to your dashboard here:
🔗 ${getFrontendUrl(req)}/login

_Note: For security, please change your password after your first login._`;

      const whatsappCloudAPI = require('../services/whatsappCloudAPI');
      const waResult = await whatsappCloudAPI.sendMessage(demoRequest.phone, whatsappMessage);
      if (waResult.success) {
        console.log(`✅ Welcome WhatsApp message sent to ${demoRequest.phone}`);
      } else {
        console.error(`❌ Welcome WhatsApp message failed to send:`, waResult.error);
      }
    } catch (waError) {
      console.error('❌ Error sending welcome WhatsApp message:', waError.message);
    }

    res.json({
      success: true,
      message: 'Demo request approved and admin account created successfully. Login credentials sent via email.',
      data: {
        admin: {
          id: newAdmin._id,
          name: newAdmin.name,
          email: newAdmin.email,
          subscriptionPlan: newAdmin.subscriptionPlan
        },
        credentials: {
          email: demoRequest.email,
          password: generatedPassword
        }
      }
    });
  } catch (error) {
    console.error('Error approving demo request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve demo request',
      error: error.message
    });
  }
};

// Reject demo request
exports.rejectDemoRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const demoRequest = await DemoRequest.findById(id);

    if (!demoRequest) {
      return res.status(404).json({
        success: false,
        message: 'Demo request not found'
      });
    }

    demoRequest.status = 'rejected';
    demoRequest.notes = reason || 'Request rejected';
    await demoRequest.save();

    res.json({
      success: true,
      message: 'Demo request rejected',
      data: demoRequest
    });
  } catch (error) {
    console.error('Error rejecting demo request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject demo request',
      error: error.message
    });
  }
};
