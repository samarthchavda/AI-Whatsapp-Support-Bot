const Template = require('../../models/Template');

async function ensureTemplateScopeIndex() {
  await Template.collection.createIndex(
    { adminId: 1, businessAccountId: 1, name: 1, language: 1 },
    { unique: true, name: 'template_waba_name_language_unique' }
  );
  const indexes = await Template.collection.indexes();
  if (indexes.some(index => index.name === 'adminId_1_name_1')) {
    await Template.collection.dropIndex('adminId_1_name_1');
  }
}

module.exports = { ensureTemplateScopeIndex };
