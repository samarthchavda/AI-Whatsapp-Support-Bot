jest.mock('../models/Template', () => ({ collection: { createIndex: jest.fn(), indexes: jest.fn(), dropIndex: jest.fn() } }));

const Template = require('../models/Template');
const { ensureTemplateScopeIndex } = require('../database/migrations/ensureTemplateScopeIndex');

test('creates WABA scoped uniqueness before dropping the old account wide index', async () => {
  Template.collection.createIndex.mockResolvedValue('template_waba_name_language_unique');
  Template.collection.indexes.mockResolvedValue([{ name: 'adminId_1_name_1' }]);
  Template.collection.dropIndex.mockResolvedValue(undefined);
  await ensureTemplateScopeIndex();
  expect(Template.collection.createIndex).toHaveBeenCalledWith(
    { adminId: 1, businessAccountId: 1, name: 1, language: 1 },
    { unique: true, name: 'template_waba_name_language_unique' }
  );
  expect(Template.collection.dropIndex).toHaveBeenCalledWith('adminId_1_name_1');
  expect(Template.collection.createIndex.mock.invocationCallOrder[0]).toBeLessThan(Template.collection.dropIndex.mock.invocationCallOrder[0]);
});
