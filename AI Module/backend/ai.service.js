const OpenAI = require('openai');

const ALLOWED_PRIMARY_CATEGORIES = [
  'Packaging',
  'Office Supplies',
  'Kitchenware',
  'Personal Care',
  'Apparel',
  'Home Essentials',
];

const ALLOWED_SUSTAINABILITY_FILTERS = [
  'plastic-free',
  'compostable',
  'biodegradable',
  'vegan',
  'recycled',
  'reusable',
];

// Create function generateCategoryData(description)
// Use OpenAI gpt-4o-mini
// Enforce strict JSON output
// Restrict primary_category to predefined list:
// Packaging, Office Supplies, Kitchenware, Personal Care, Apparel, Home Essentials
// Return parsed JSON
// Throw error if invalid JSON
async function generateCategoryData(description) {
  if (!description || typeof description !== 'string') {
    throw new Error('Description is required and must be a string.');
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is missing in environment variables.');
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const prompt = `You are an AI product classification engine.\n\nClassify the following product description and return ONLY valid JSON with this exact shape:\n{\n  "primary_category": "string",\n  "sub_category": "string",\n  "seo_tags": ["string"],\n  "sustainability_filters": ["plastic-free" | "compostable" | "biodegradable" | "vegan" | "recycled" | "reusable"]\n}\n\nRules:\n1) primary_category must be exactly one of: ${ALLOWED_PRIMARY_CATEGORIES.join(', ')}\n2) seo_tags length must be between 5 and 10\n3) sustainability_filters values must be from: ${ALLOWED_SUSTAINABILITY_FILTERS.join(', ')}\n4) Return JSON only, no markdown, no explanation\n\nProduct description:\n${description}`;

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You return strict JSON only. Never include any text outside JSON.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const rawContent = completion.choices?.[0]?.message?.content;

  if (!rawContent) {
    throw new Error('Empty response received from OpenAI.');
  }

  let parsed;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    throw new Error('Invalid JSON received from OpenAI response.');
  }

  if (!ALLOWED_PRIMARY_CATEGORIES.includes(parsed.primary_category)) {
    throw new Error(
      `Invalid primary_category. Must be one of: ${ALLOWED_PRIMARY_CATEGORIES.join(', ')}`
    );
  }

  return {
    prompt,
    rawResponse: rawContent,
    parsedData: parsed,
  };
}

module.exports = {
  generateCategoryData,
  ALLOWED_PRIMARY_CATEGORIES,
  ALLOWED_SUSTAINABILITY_FILTERS,
};
