const {
  ALLOWED_PRIMARY_CATEGORIES,
  ALLOWED_SUSTAINABILITY_FILTERS,
} = require('./ai.service');

// Validate that primary_category exists in predefined list
// If not, throw error
function validatePrimaryCategory(primaryCategory) {
  if (!primaryCategory || typeof primaryCategory !== 'string') {
    throw new Error('primary_category is required and must be a string.');
  }

  if (!ALLOWED_PRIMARY_CATEGORIES.includes(primaryCategory)) {
    throw new Error(
      `Invalid primary_category. Must be one of: ${ALLOWED_PRIMARY_CATEGORIES.join(', ')}`
    );
  }

  return true;
}

function validateGeneratedData(aiData) {
  if (!aiData || typeof aiData !== 'object') {
    throw new Error('AI data is required.');
  }

  const { primary_category, sub_category, seo_tags, sustainability_filters } =
    aiData;

  validatePrimaryCategory(primary_category);

  if (!sub_category || typeof sub_category !== 'string') {
    throw new Error('sub_category is required and must be a string.');
  }

  if (!Array.isArray(seo_tags) || seo_tags.length < 5 || seo_tags.length > 10) {
    throw new Error('seo_tags must be an array with 5 to 10 items.');
  }

  const invalidTag = seo_tags.find((tag) => !tag || typeof tag !== 'string');
  if (invalidTag !== undefined) {
    throw new Error('All seo_tags must be non-empty strings.');
  }

  if (!Array.isArray(sustainability_filters)) {
    throw new Error('sustainability_filters must be an array.');
  }

  const invalidFilter = sustainability_filters.find(
    (filter) => !ALLOWED_SUSTAINABILITY_FILTERS.includes(filter)
  );

  if (invalidFilter) {
    throw new Error(
      `Invalid sustainability filter: ${invalidFilter}. Allowed filters: ${ALLOWED_SUSTAINABILITY_FILTERS.join(', ')}`
    );
  }

  return true;
}

module.exports = {
  validatePrimaryCategory,
  validateGeneratedData,
};
