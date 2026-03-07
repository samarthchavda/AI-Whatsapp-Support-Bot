const Product = require('./Product');
const AILog = require('./AILog');
const { generateCategoryData } = require('./ai.service');
const { validateGeneratedData } = require('./category.service');

// Create controller createProduct
// Steps:
// 1. Accept name & description
// 2. Call AI service
// 3. Validate category
// 4. Save prompt + response in AILog
// 5. Save product in DB
// 6. Return saved product
// 7. Proper error handling
async function createProduct(req, res) {
  try {
    const { name, description } = req.body;

    if (!name || !description) {
      return res.status(400).json({
        success: false,
        message: 'name and description are required.',
      });
    }

    const { prompt, rawResponse, parsedData } = await generateCategoryData(
      description
    );

    validateGeneratedData(parsedData);

    await AILog.create({
      prompt,
      rawResponse,
      parsedResponse: parsedData,
    });

    const product = await Product.create({
      name,
      description,
      aiData: parsedData,
    });

    return res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
}

module.exports = {
  createProduct,
};
