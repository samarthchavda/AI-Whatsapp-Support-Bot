const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Razorpay = require('razorpay');

async function testRazorpayDB() {
  console.log('Connecting to database...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const GlobalSettings = require('../models/GlobalSettings');
  const keyIdSetting = await GlobalSettings.findOne({ key: 'razorpay_key_id' });
  const keySecretSetting = await GlobalSettings.findOne({ key: 'razorpay_key_secret' });

  const rzpKeyId = keyIdSetting ? keyIdSetting.value : process.env.RAZORPAY_KEY_ID;
  const rzpKeySecret = keySecretSetting ? keySecretSetting.value : process.env.RAZORPAY_KEY_SECRET;

  console.log('Using Key ID:', rzpKeyId);
  console.log('Using Key Secret Length:', rzpKeySecret ? rzpKeySecret.length : 0);

  if (!rzpKeyId || !rzpKeySecret) {
    console.error('❌ Error: Razorpay Key ID or Secret is missing.');
    mongoose.connection.close();
    return;
  }

  const razorpay = new Razorpay({
    key_id: rzpKeyId,
    key_secret: rzpKeySecret
  });

  const options = {
    amount: 10000, // 100 INR in paise
    currency: 'INR',
    receipt: `db_test_rcpt_${Date.now()}`
  };

  try {
    console.log('Creating test order with options:', options);
    const order = await razorpay.orders.create(options);
    console.log('✅ Success! Order created:');
    console.log(order);
  } catch (error) {
    console.error('❌ Razorpay Error:');
    console.error(error);
  } finally {
    mongoose.connection.close();
  }
}

testRazorpayDB();
