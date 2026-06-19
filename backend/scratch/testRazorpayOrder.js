const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Razorpay = require('razorpay');

async function testRazorpay() {
  console.log('=== Testing Razorpay Order Creation ===');
  console.log('Using Key ID:', process.env.RAZORPAY_KEY_ID);
  console.log('Using Key Secret Length:', process.env.RAZORPAY_KEY_SECRET ? process.env.RAZORPAY_KEY_SECRET.length : 0);

  const rzpKeyId = process.env.RAZORPAY_KEY_ID;
  const rzpKeySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!rzpKeyId || !rzpKeySecret) {
    console.error('❌ Error: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing in .env');
    return;
  }

  const razorpay = new Razorpay({
    key_id: rzpKeyId,
    key_secret: rzpKeySecret
  });

  const options = {
    amount: 10000, // 100 INR in paise
    currency: 'INR',
    receipt: `test_rcpt_${Date.now()}`
  };

  try {
    console.log('Creating test order with options:', options);
    const order = await razorpay.orders.create(options);
    console.log('✅ Success! Order created:');
    console.log(order);
  } catch (error) {
    console.error('❌ Razorpay Error:');
    console.error(error);
  }
}

testRazorpay();
