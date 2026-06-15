const mongoose = require('mongoose');
const Integration = require('../models/Integration');
const Admin = require('../models/Admin');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');
  
  const integrations = await Integration.find({});
  console.log('All Integrations:', integrations);

  await mongoose.disconnect();
}
run();
