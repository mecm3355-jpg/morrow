const mongoose = require('mongoose');

const PRODUCT_CATEGORIES = ['상의', '하의', '악세사리'];

const productSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: [true, 'SKU는 필수입니다.'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, '상품 이름은 필수입니다.'],
      trim: true,
      maxlength: [100, '상품 이름은 100자 이하여야 합니다.'],
    },
    price: {
      type: Number,
      required: [true, '상품 가격은 필수입니다.'],
      min: [0, '상품 가격은 0원 이상이어야 합니다.'],
      validate: {
        validator: Number.isInteger,
        message: '상품 가격은 정수로 입력해야 합니다.',
      },
    },
    category: {
      type: String,
      required: [true, '카테고리는 필수입니다.'],
      enum: {
        values: PRODUCT_CATEGORIES,
        message: '카테고리는 상의, 하의, 악세사리 중 하나여야 합니다.',
      },
    },
    image: {
      type: String,
      required: [true, '상품 이미지는 필수입니다.'],
      trim: true,
    },
    spinImages: {
      type: [{
        type: String,
        trim: true,
      }],
      default: [],
      validate: {
        validator: (images) => images.length <= 48,
        message: '360도 이미지는 최대 48장까지 등록할 수 있습니다.',
      },
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, '상품 설명은 2,000자 이하여야 합니다.'],
      default: '',
    },
  },
  {
    timestamps: true,
  },
);

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
module.exports.PRODUCT_CATEGORIES = PRODUCT_CATEGORIES;
