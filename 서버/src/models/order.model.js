const mongoose = require('mongoose');

const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'shipped',
  'delivered',
  'cancelled',
];

const integerMoneyField = (label, defaultValue) => ({
  type: Number,
  required: defaultValue === undefined,
  default: defaultValue,
  min: [0, `${label}은(는) 0원 이상이어야 합니다.`],
  validate: {
    validator: Number.isInteger,
    message: `${label}은(는) 정수로 입력해야 합니다.`,
  },
});

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, '주문 상품은 필수입니다.'],
    },
    selectedOption: {
      type: String,
      trim: true,
      maxlength: [50, '상품 옵션은 50자 이하여야 합니다.'],
      default: '',
    },
    unitPrice: integerMoneyField('상품 단가'),
    quantity: {
      type: Number,
      required: [true, '주문 수량은 필수입니다.'],
      min: [1, '주문 수량은 1개 이상이어야 합니다.'],
      max: [99, '주문 수량은 99개 이하여야 합니다.'],
      validate: {
        validator: Number.isInteger,
        message: '주문 수량은 정수로 입력해야 합니다.',
      },
    },
    lineAmount: integerMoneyField('상품별 주문 금액'),
  },
  { _id: true },
);

orderItemSchema.pre('validate', function calculateLineAmount() {
  if (Number.isInteger(this.unitPrice) && Number.isInteger(this.quantity)) {
    this.lineAmount = this.unitPrice * this.quantity;
  }
});

const shippingAddressSchema = new mongoose.Schema(
  {
    recipientName: {
      type: String,
      required: [true, '받는 분 이름은 필수입니다.'],
      trim: true,
      maxlength: [50, '받는 분 이름은 50자 이하여야 합니다.'],
    },
    phone: {
      type: String,
      required: [true, '연락처는 필수입니다.'],
      trim: true,
      maxlength: [20, '연락처는 20자 이하여야 합니다.'],
    },
    postalCode: {
      type: String,
      required: [true, '우편번호는 필수입니다.'],
      trim: true,
      maxlength: [10, '우편번호는 10자 이하여야 합니다.'],
    },
    address1: {
      type: String,
      required: [true, '기본 주소는 필수입니다.'],
      trim: true,
      maxlength: [200, '기본 주소는 200자 이하여야 합니다.'],
    },
    address2: {
      type: String,
      trim: true,
      maxlength: [200, '상세 주소는 200자 이하여야 합니다.'],
      default: '',
    },
  },
  { _id: false },
);

const orderAmountsSchema = new mongoose.Schema(
  {
    itemsAmount: integerMoneyField('상품 금액'),
    discountAmount: integerMoneyField('할인 금액', 0),
    totalAmount: integerMoneyField('최종 주문 금액'),
  },
  { _id: false },
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      enum: ORDER_STATUSES,
    },
    changedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
  },
  { _id: false },
);

const paymentSchema = new mongoose.Schema(
  {
    impUid: {
      type: String,
      required: [true, '포트원 결제 번호는 필수입니다.'],
      trim: true,
      immutable: true,
    },
    merchantUid: {
      type: String,
      required: [true, '가맹점 주문 번호는 필수입니다.'],
      trim: true,
      immutable: true,
    },
    payMethod: {
      type: String,
      required: [true, '결제 수단은 필수입니다.'],
      trim: true,
    },
    pgProvider: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      required: [true, '결제 상태는 필수입니다.'],
      enum: ['ready', 'paid'],
    },
    amount: integerMoneyField('결제 금액'),
    paidAt: Date,
    receiptUrl: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: [true, '주문 번호는 필수입니다.'],
      unique: true,
      trim: true,
      uppercase: true,
      immutable: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '주문 사용자는 필수입니다.'],
      immutable: true,
      index: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: '주문 상품은 한 개 이상이어야 합니다.',
      },
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: [true, '배송지는 필수입니다.'],
    },
    amounts: {
      type: orderAmountsSchema,
      required: [true, '주문 금액 정보는 필수입니다.'],
    },
    payment: {
      type: paymentSchema,
      required: [true, '결제 정보는 필수입니다.'],
    },
    status: {
      type: String,
      required: true,
      enum: ORDER_STATUSES,
      default: 'pending',
      index: true,
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: () => [{ status: 'pending' }],
    },
    deliveryMemo: {
      type: String,
      trim: true,
      maxlength: [200, '배송 메모는 200자 이하여야 합니다.'],
      default: '',
    },
    cancelledAt: Date,
  },
  { timestamps: true },
);

orderSchema.pre('validate', function calculateAmounts() {
  if (!this.amounts || !Array.isArray(this.items)) return;

  const itemsAmount = this.items.reduce((sum, item) => {
    if (!Number.isInteger(item.unitPrice) || !Number.isInteger(item.quantity)) return sum;
    return sum + item.unitPrice * item.quantity;
  }, 0);

  this.amounts.itemsAmount = itemsAmount;

  const { discountAmount } = this.amounts;
  if (Number.isInteger(discountAmount)) {
    this.amounts.totalAmount = itemsAmount - discountAmount;
  }
});

orderSchema.path('amounts').validate(function validateDiscount(amounts) {
  if (!amounts) return true;
  return amounts.discountAmount <= amounts.itemsAmount;
}, '할인 금액은 상품 금액을 초과할 수 없습니다.');

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'payment.impUid': 1 }, { unique: true, sparse: true });
orderSchema.index({ 'payment.merchantUid': 1 }, { unique: true, sparse: true });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
module.exports.ORDER_STATUSES = ORDER_STATUSES;
