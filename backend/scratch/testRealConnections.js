const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const whatsappCloudAPI = require('../services/whatsappCloudAPI');
const nodemailer = require('nodemailer');

async function testWhatsApp() {
  console.log('Testing WhatsApp Cloud API...');
  const testNumber = '918128420287'; // Indian country code 91 + number
  const message = 'Hello! This is a real-time verification message from your AI WhatsApp Support Bot to confirm your Meta Cloud API integration is working successfully. 🚀';

  try {
    const result = await whatsappCloudAPI.sendMessage(testNumber, message);
    if (result.success) {
      console.log('✅ WhatsApp message sent successfully!');
      console.log('   Message ID:', result.messageId);
    } else {
      console.error('❌ WhatsApp send failed:', result.error);
    }
  } catch (error) {
    console.error('❌ WhatsApp error:', error);
  }
}

async function testGmail() {
  console.log('\nTesting Gmail SMTP Configuration...');
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const mailOptions = {
    from: `"AI WhatsApp Support Bot" <${process.env.SMTP_USER}>`,
    to: process.env.SMTP_USER, // Send to self to verify delivery
    subject: '🔐 SMTP Configuration Success - WhatsApp Support Bot',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px;">
        <h2 style="color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 10px;">Connection Test Successful!</h2>
        <p>Hello,</p>
        <p>This email confirms that your Gmail SMTP credentials (using App Passwords) are configured correctly and the WhatsApp Support Bot backend can send email alerts successfully.</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <strong>SMTP User:</strong> ${process.env.SMTP_USER}<br/>
          <strong>SMTP Host:</strong> ${process.env.SMTP_HOST || 'smtp.gmail.com'}<br/>
          <strong>Port:</strong> ${process.env.SMTP_PORT || '587'}
        </div>
        <p>Best regards,<br/>WhatsApp Support Bot Setup</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Gmail SMTP verification successful!');
    console.log('   Message ID:', info.messageId);
  } catch (error) {
    console.error('❌ Gmail SMTP error:', error.message);
  }
}

async function run() {
  console.log('=== Starting Real Integration Verification ===');
  console.log('Config loaded:');
  console.log(' - WhatsApp Phone ID:', process.env.WHATSAPP_PHONE_NUMBER_ID);
  console.log(' - SMTP User:', process.env.SMTP_USER);
  
  await testWhatsApp();
  await testGmail();
  
  console.log('\n=== Verification Finished ===');
}

run();
