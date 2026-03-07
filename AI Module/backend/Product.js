const mongoose = require('mongoose');

// Create a Mongoose model for Product
// Fields:
// name (string)
// description (string)
// aiData object with:
//    primary_category
//    sub_category
//    seo_tags (array)
//    sustainability_filters (array)
// timestamps true

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    aiData: {
      primary_category: {
        type: String,
        required: true,
      },
      sub_category: {
        type: String,
        required: true,
      },
      seo_tags: {
        type: [String],
        default: [],
      },
      sustainability_filters: {
        type: [String],
        default: [],
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Product', productSchema);
