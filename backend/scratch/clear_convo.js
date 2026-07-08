const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const Conversation = require('../models/Conversation');
  const result = await Conversation.deleteMany({ customerPhone: '918128420287' });
  console.log('Deleted conversations count:', result.deletedCount);

  const AILog = require('../models/AILog');
  const logResult = await AILog.deleteMany({ customerPhone: '918128420287' });
  console.log('Deleted AI logs count:', logResult.deletedCount);

  await mongoose.disconnect();
}

main().catch(err => console.error(err));
