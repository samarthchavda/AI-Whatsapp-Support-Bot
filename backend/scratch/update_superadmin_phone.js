const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Admin = require('../models/Admin');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const result = await Admin.updateOne(
      { email: 'superadmin@gmail.com' },
      { 
        $set: { 
          phone: '918128420287',
          businessPhone: '918128420287'
        } 
      }
    );

    console.log('Update result:', result);

    const updated = await Admin.findOne({ email: 'superadmin@gmail.com' });
    console.log('Updated Super Admin record:');
    console.log(`- ID: ${updated._id}`);
    console.log(`  Email: ${updated.email}`);
    console.log(`  Phone: ${updated.phone}`);
    console.log(`  Business Phone: ${updated.businessPhone}`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
