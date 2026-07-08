const mongoose = require('/Users/chavdasamarth/Project-Task/AI WhatsApp Support Bot/backend/node_modules/mongoose');
require('/Users/chavdasamarth/Project-Task/AI WhatsApp Support Bot/backend/node_modules/dotenv').config({ path: '/Users/chavdasamarth/Project-Task/AI WhatsApp Support Bot/backend/.env' });

async function remove() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB.");

  const Lead = require('/Users/chavdasamarth/Project-Task/AI WhatsApp Support Bot/backend/models/Lead');

  const result = await Lead.deleteOne({ businessName: '1into2 Digital' });
  if (result.deletedCount > 0) {
    console.log("Successfully removed 1into2 Digital from leads.");
  } else {
    console.log("Lead 1into2 Digital not found in database.");
  }

  await mongoose.disconnect();
  console.log("Disconnected from MongoDB.");
}

remove().catch(console.error);
