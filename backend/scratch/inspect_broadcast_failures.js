const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const Broadcast = require('../models/Broadcast');
  const broadcast = await Broadcast.findOne({}).sort({ createdAt: -1 });

  if (broadcast) {
    console.log('\n--- LATEST BROADCAST ---');
    console.log('ID:', broadcast._id);
    console.log('Title:', broadcast.title);
    console.log('Status:', broadcast.status);
    console.log('Sent Count:', broadcast.sentCount);
    console.log('Failed Count:', broadcast.failedCount);
    console.log('Total Recipients:', broadcast.totalRecipients);
    console.log('\nRecipients details:');
    broadcast.recipients.forEach((r, idx) => {
      console.log(`Recipient #${idx + 1}: Phone=${r.phone}, Name=${r.name}, Status=${r.status}, Error=${r.error || 'none'}`);
    });
  } else {
    console.log('No broadcasts found.');
  }

  await mongoose.disconnect();
}

main().catch(err => console.error(err));
