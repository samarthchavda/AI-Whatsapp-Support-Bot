require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('./models/Order');

async function checkPhone() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Check different phone formats
    const phone = '9054167563';
    
    const exact = await Order.find({ customerPhone: phone });
    console.log(`📞 Orders with exact "${phone}":`, exact.length);
    
    const withPlus91 = await Order.find({ customerPhone: `+91${phone}` });
    console.log(`📞 Orders with "+91${phone}":`, withPlus91.length);
    
    const withCountry = await Order.find({ customerPhone: `91${phone}` });
    console.log(`📞 Orders with "91${phone}":`, withCountry.length);
    
    const regex = await Order.find({ customerPhone: new RegExp(phone) });
    console.log(`📞 Orders matching /${phone}/:`, regex.length);
    
    if (regex.length > 0) {
      console.log('\n✅ Found orders:');
      regex.forEach(o => {
        console.log(`  ${o.orderId} - ${o.customerPhone} - ${o.customerName} - ${o.status}`);
      });
    } else {
      console.log('\n❌ No orders found with phone containing:', phone);
    }
    
    // Show all orders to see format
    const allOrders = await Order.find().limit(5);
    console.log(`\n📋 Sample orders (showing phone format):`);
    allOrders.forEach(o => {
      console.log(`  ${o.orderId} - Phone: "${o.customerPhone}" - ${o.customerName}`);
    });
    
    // Check WhatsApp format (usually comes as 91XXXXXXXXXX@c.us)
    const whatsappFormat = `91${phone}`;
    const whatsapp = await Order.find({ customerPhone: whatsappFormat });
    console.log(`\n📱 WhatsApp format "${whatsappFormat}":`, whatsapp.length);
    
    await mongoose.connection.close();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkPhone();
