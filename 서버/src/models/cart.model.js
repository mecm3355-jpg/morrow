const mongoose = require('mongoose');

const MAX_CART_ITEM_QUANTITY = 99;

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, '장바구니 상품은 필수입니다.'],
    },
    selectedOption: {
      type: String,
      trim: true,
      maxlength: [50, '상품 옵션은 50자 이하여야 합니다.'],
      default: '',
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
    quantity: {
      type: Number,
      required: [true, '상품 수량은 필수입니다.'],
      min: [1, '상품 수량은 1개 이상이어야 합니다.'],
      max: [MAX_CART_ITEM_QUANTITY, `상품 수량은 ${MAX_CART_ITEM_QUANTITY}개 이하여야 합니다.`],
      default: 1,
      validate: {
        validator: Number.isInteger,
        message: '상품 수량은 정수로 입력해야 합니다.',
      },
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
  },
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '장바구니 사용자는 필수입니다.'],
      unique: true,
      index: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
      validate: {
        validator(items) {
          const itemKeys = items.map((item) => `${item.product?.toString() || ''}:${item.selectedOption || ''}`);
          return new Set(itemKeys).size === itemKeys.length;
        },
        message: '같은 상품과 옵션을 장바구니에 중복으로 담을 수 없습니다.',
      },
    },
  },
  {
    timestamps: true,
  },
);

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
module.exports.MAX_CART_ITEM_QUANTITY = MAX_CART_ITEM_QUANTITY;
