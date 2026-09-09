const mongoose = require('mongoose');

async function searchAll() {
  const conn = await mongoose.connect('mongodb://127.0.0.1:27017/admin');
  const adminDb = conn.connection.db.admin();
  const dbs = await adminDb.listDatabases();

  console.log('Searching all databases...');

  for (const dbInfo of dbs.databases) {
    const dbName = dbInfo.name;
    if (['admin', 'config', 'local'].includes(dbName)) continue;
    try {
      const dbConn = await mongoose.createConnection(`mongodb://127.0.0.1:27017/${dbName}`).asPromise();
      const collections = await dbConn.db.listCollections().toArray();
      
      for (const col of collections) {
        const rawCol = dbConn.db.collection(col.name);
        const docs = await rawCol.find({
          $or: [
            { title: { $regex: /blog|whatsapp|cart|signup/i } },
            { slug: { $exists: true } },
            { coverImage: { $exists: true } }
          ]
        }).toArray();

        if (docs.length > 0) {
          console.log(`\n>>> FOUND ${docs.length} matching docs in DB [${dbName}] -> Collection [${col.name}]`);
          docs.forEach(d => {
            console.log('   ID:', d._id);
            console.log('   Title:', d.title);
            console.log('   Slug:', d.slug);
            console.log('   Status:', d.status);
            console.log('   CoverImage:', d.coverImage);
            console.log('   CreatedAt:', d.createdAt);
          });
        }
      }
      await dbConn.close();
    } catch (e) {
      console.log('Error searching', dbName, e.message);
    }
  }
  await mongoose.disconnect();
  console.log('Done searching.');
}
searchAll().catch(console.error);
