// Cleans the local copy of the production database so nothing in it can reach
// real customers or services: removes WhatsApp/Meta tokens, store and CRM
// credentials, API keys, webhook secrets and URLs, password-reset tokens and
// sessions, and turns the WhatsApp Web bot off.
// Account passwords (bcrypt hashes) are kept so you can log in locally with
// your normal super admin password.
//
// Runs only against the local copy:  mongosh <local-uri> sanitize.js

const LOCAL_DB = 'kwickbot_superadmin_local';
if (db.getName() !== LOCAL_DB) {
  print(`Refusing to run: connected to "${db.getName()}", expected "${LOCAL_DB}".`);
  quit(1);
}
const host = String(db.getMongo().getURI ? db.getMongo().getURI() : db.serverStatus().host);
if (!/127\.0\.0\.1|localhost/.test(host)) {
  print(`Refusing to run: ${host} is not a local MongoDB.`);
  quit(1);
}

// Any field (at any depth) with one of these names is removed
const SECRET_FIELD = /^(access_?token|refresh_?tokens?|whatsappAccessToken|api_?key|.*secret|private_?key|encrypted.*|credentials?|reset_?password_?token|verify_?token|webhookUrl|developerWebhookUrl|url)$/i;
// Collections where `url` is a public link, not a destination we would call
const KEEP_URL = new Set(['blogposts', 'pagevisits', 'knowledgebases', 'templates', 'orders', 'abandonedcarts', 'integrations', 'crmconnections']);

function secretPaths(value, prefix, collection, out) {
  if (Array.isArray(value)) {
    value.forEach((item, i) => secretPaths(item, `${prefix}.${i}`, collection, out));
    return out;
  }
  if (!value || typeof value !== 'object' || value instanceof Date || value._bsontype) return out;
  for (const key of Object.keys(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (key === 'password' && collection === 'admins' && !prefix) continue;
    if (key.toLowerCase() === 'url' && KEEP_URL.has(collection)) continue;
    const v = value[key];
    const empty = v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);
    if (SECRET_FIELD.test(key) && !empty) out.push(path);
    else secretPaths(value[key], path, collection, out);
  }
  return out;
}

let removed = 0;
for (const name of db.getCollectionNames()) {
  const coll = db.getCollection(name);
  coll.find({}).forEach((doc) => {
    const paths = secretPaths(doc, '', name, []);
    if (!paths.length) return;
    const unset = {};
    paths.forEach((p) => { unset[p] = ''; });
    coll.updateOne({ _id: doc._id }, { $unset: unset });
    removed += paths.length;
  });
}

// Sign every account out of the copy and stop the WhatsApp Web bot
db.admins.updateMany({}, { $set: { refreshTokens: [] }, $inc: { tokenVersion: 1 } });
db.globalsettings.updateOne({ key: 'webBotEnabled' }, { $set: { value: false } });
db.admins.updateMany({}, { $set: { webBotEnabled: false } });

// Check nothing secret is left
let left = 0;
for (const name of db.getCollectionNames()) {
  db.getCollection(name).find({}).forEach((doc) => { left += secretPaths(doc, '', name, []).length; });
}

print(`Removed ${removed} secret fields. Remaining: ${left}.`);
print(`Accounts: ${db.admins.countDocuments()} (passwords kept for local login)`);
if (left > 0) quit(1);
