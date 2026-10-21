const crypto = require('node:crypto');
const mongoose = require('mongoose');

const Order = require('../models/order.model');
const Product = require('../models/product.model');

const ORDERS_PER_PAGE = 10;
const MAX_ORDERS_PER_PAGE = 50;
const MAX_ITEM_QUANTITY = 99;
const PRODUCT_FIELDS = 'sku name price category image';
const PORTONE_API_URL = 'https://api.iamport.kr';
const SHIPPING_ADDRESS_FIELDS = [
  'recipientName',
  'phone',
  'postalCode',
  'address1',
  'address2',
];

function isValidObjectId(value) {
  return mongoose.isObjectIdOrHexString(value);
}

function createOrderNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `ORD-${date}-${random}`;
}

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizePaymentId(value) {
  if (typeof value !== 'string') return '';
  const paymentId = value.trim();
  return paymentId.length <= 100 ? paymentId : '';
}

function getPortOneMerchantCode() {
  const merchantCode = process.env.PORTONE_MERCHANT_CODE?.trim() || '';

  if (!/^imp[a-zA-Z0-9]+$/.test(merchantCode)) {
    throw createHttpError(503, '포트원 고객사 식별코드가 설정되지 않았습니다.');
  }

  return merchantCode;
}

async function requestPortOne(path, options = {}) {
  let response;

  try {
    response = await fetch(`${PORTONE_API_URL}${path}`, options);
  } catch {
    throw createHttpError(502, '포트원 결제 서버에 연결할 수 없습니다.');
  }

  const data = await response.json().catch(() => null);

  if (!response.ok || data?.code !== 0 || !data.response) {
    throw createHttpError(502, data?.message || '포트원 결제 정보를 확인하지 못했습니다.');
  }

  return data.response;
}

async function getPortOneAccessToken() {
  const apiKey = process.env.PORTONE_API_KEY || process.env.IMP_KEY;
  const apiSecret = process.env.PORTONE_API_SECRET || process.env.IMP_SECRET;

  if (!apiKey || !apiSecret) {
    throw createHttpError(503, '포트원 API 인증 정보가 설정되지 않았습니다.');
  }

  const token = await requestPortOne('/users/getToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imp_key: apiKey,
      imp_secret: apiSecret,
    }),
  });

  if (!token.access_token) {
    throw createHttpError(502, '포트원 액세스 토큰을 발급받지 못했습니다.');
  }

  return token.access_token;
}

async function getPaymentConfiguration(req, res) {
  const configuredMerchantCode = getPortOneMerchantCode();
  const requestedMerchantCode = normalizePaymentId(req.query?.merchantCode);

  if (!requestedMerchantCode) {
    return res.status(400).json({ message: '클라이언트의 포트원 고객사 식별코드가 필요합니다.' });
  }

  if (requestedMerchantCode !== configuredMerchantCode) {
    return res.status(409).json({
      message: '클라이언트와 서버의 포트원 고객사 식별코드가 일치하지 않습니다.',
    });
  }

  await getPortOneAccessToken();
  return res.status(200).json({ merchantCode: configuredMerchantCode, ready: true });
}

async function getPortOnePayment(impUid) {
  const accessToken = await getPortOneAccessToken();
  const includeSandboxPayments = process.env.PORTONE_INCLUDE_SANDBOX_PAYMENTS === 'true';
  const query = includeSandboxPayments ? '?include_sandbox=true' : '';

  return requestPortOne(`/payments/${encodeURIComponent(impUid)}${query}`, {
    headers: { Authorization: accessToken },
  });
}

function validatePayment(payment, { impUid, merchantUid, expectedAmount }) {
  if (payment.imp_uid !== impUid || payment.merchant_uid !== merchantUid) {
    throw createHttpError(400, '결제 식별 정보가 일치하지 않습니다.');
  }

  if (Number(payment.amount) !== expectedAmount) {
    throw createHttpError(400, '실제 결제 금액과 주문 금액이 일치하지 않습니다.');
  }

  if ((payment.currency && payment.currency !== 'KRW') || Number(payment.cancel_amount || 0) > 0) {
    throw createHttpError(400, '결제 통화 또는 취소 상태를 확인해 주세요.');
  }

  const isPaid = payment.status === 'paid';
  const isVirtualBankReady = payment.pay_method === 'vbank' && payment.status === 'ready';

  if (!isPaid && !isVirtualBankReady) {
    throw createHttpError(400, '결제가 완료되지 않았습니다.');
  }

  return isPaid ? 'confirmed' : 'pending';
}

function normalizeSelectedOption(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function pickShippingAddress(address = {}) {
  return SHIPPING_ADDRESS_FIELDS.reduce((result, field) => {
    if (Object.prototype.hasOwnProperty.call(address, field)) {
      result[field] = address[field];
    }
    return result;
  }, {});
}

function normalizeRequestedItems(items) {
  if (!Array.isArray(items) || items.length === 0) return null;

  const normalizedItems = new Map();

  for (const item of items) {
    const productId = item?.productId;
    const selectedOption = normalizeSelectedOption(item?.selectedOption);
    const quantity = Number(item?.quantity);

    if (
      !isValidObjectId(productId)
      || !Number.isInteger(quantity)
      || quantity < 1
      || quantity > MAX_ITEM_QUANTITY
      || selectedOption.length > 50
    ) {
      return null;
    }

    const normalizedProductId = productId.toString();
    const key = `${normalizedProductId}:${selectedOption}`;
    const existingItem = normalizedItems.get(key);
    const combinedQuantity = (existingItem?.quantity || 0) + quantity;

    if (combinedQuantity > MAX_ITEM_QUANTITY) return null;

    normalizedItems.set(key, {
      productId: normalizedProductId,
      selectedOption,
      quantity: combinedQuantity,
    });
  }

  return [...normalizedItems.values()];
}

async function createOrder(req, res) {
  const requestedItems = normalizeRequestedItems(req.body?.items);
  const impUid = normalizePaymentId(req.body?.imp_uid);
  const merchantUid = normalizePaymentId(req.body?.merchant_uid);
  const requestedMerchantCode = normalizePaymentId(req.body?.merchantCode);
  const configuredMerchantCode = getPortOneMerchantCode();

  if (!requestedMerchantCode || requestedMerchantCode !== configuredMerchantCode) {
    return res.status(409).json({
      message: '결제에 사용한 포트원 고객사 식별코드가 서버 설정과 일치하지 않습니다.',
    });
  }

  if (!requestedItems) {
    return res.status(400).json({
      message: `주문 상품과 1개 이상 ${MAX_ITEM_QUANTITY}개 이하의 수량을 확인해 주세요.`,
    });
  }

  if (!impUid || !merchantUid) {
    return res.status(400).json({ message: '결제 식별 정보가 필요합니다.' });
  }

  const duplicateOrder = await Order.exists({
    $or: [
      { 'payment.impUid': impUid },
      { 'payment.merchantUid': merchantUid },
    ],
  });

  if (duplicateOrder) {
    return res.status(409).json({ message: '이미 처리된 주문입니다.' });
  }

  const productIds = [...new Set(requestedItems.map((item) => item.productId))];
  const products = await Product.find({ _id: { $in: productIds } }).select(PRODUCT_FIELDS);
  const productsById = new Map(products.map((product) => [product._id.toString(), product]));
  const unavailableProductIds = productIds.filter((productId) => !productsById.has(productId));

  if (unavailableProductIds.length > 0) {
    return res.status(404).json({
      message: '주문할 수 없는 상품이 포함되어 있습니다.',
      productIds: unavailableProductIds,
    });
  }

  const orderItems = requestedItems.map((item) => ({
    product: item.productId,
    selectedOption: item.selectedOption,
    unitPrice: productsById.get(item.productId).price,
    quantity: item.quantity,
  }));
  const expectedAmount = orderItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const payment = await getPortOnePayment(impUid);
  const orderStatus = validatePayment(payment, {
    impUid,
    merchantUid,
    expectedAmount,
  });

  const order = await Order.create({
    orderNumber: createOrderNumber(),
    user: req.auth.userId,
    items: orderItems,
    shippingAddress: pickShippingAddress(req.body?.shippingAddress),
    amounts: { discountAmount: 0 },
    payment: {
      impUid,
      merchantUid,
      payMethod: payment.pay_method,
      pgProvider: payment.pg_provider,
      status: payment.status,
      amount: Number(payment.amount),
      paidAt: payment.paid_at ? new Date(payment.paid_at * 1000) : undefined,
      receiptUrl: payment.receipt_url || '',
    },
    status: orderStatus,
    statusHistory: orderStatus === 'confirmed'
      ? [{ status: 'pending' }, { status: 'confirmed' }]
      : [{ status: 'pending' }],
    deliveryMemo: typeof req.body?.deliveryMemo === 'string' ? req.body.deliveryMemo : '',
  });

  await order.populate('items.product', PRODUCT_FIELDS);
  return res.status(201).json(order);
}

async function getOrders(req, res) {
  const requestedPage = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const requestedLimit = Number.parseInt(req.query.limit, 10) || ORDERS_PER_PAGE;
  const limit = Math.min(Math.max(requestedLimit, 1), MAX_ORDERS_PER_PAGE);
  const filter = { user: req.auth.userId };
  const total = await Order.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(requestedPage, totalPages);
  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('items.product', PRODUCT_FIELDS);

  return res.status(200).json({
    orders,
    pagination: {
      page,
      pageSize: limit,
      total,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
    },
  });
}

async function getOrderById(req, res) {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: '유효하지 않은 주문 ID입니다.' });
  }

  const order = await Order.findOne({
    _id: req.params.id,
    user: req.auth.userId,
  }).populate('items.product', PRODUCT_FIELDS);

  if (!order) {
    return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
  }

  return res.status(200).json(order);
}

async function updateOrder(req, res) {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: '유효하지 않은 주문 ID입니다.' });
  }

  const hasShippingAddress = req.body?.shippingAddress
    && typeof req.body.shippingAddress === 'object'
    && Object.keys(pickShippingAddress(req.body.shippingAddress)).length > 0;
  const hasDeliveryMemo = Object.prototype.hasOwnProperty.call(req.body || {}, 'deliveryMemo');

  if (!hasShippingAddress && !hasDeliveryMemo) {
    return res.status(400).json({ message: '수정할 주문 정보를 입력해 주세요.' });
  }

  const order = await Order.findOne({
    _id: req.params.id,
    user: req.auth.userId,
  });

  if (!order) {
    return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
  }

  if (order.status !== 'pending') {
    return res.status(409).json({ message: '접수 대기 중인 주문만 수정할 수 있습니다.' });
  }

  if (hasShippingAddress) {
    order.shippingAddress.set(pickShippingAddress(req.body.shippingAddress));
  }

  if (hasDeliveryMemo) {
    order.deliveryMemo = req.body.deliveryMemo;
  }

  await order.save();
  await order.populate('items.product', PRODUCT_FIELDS);
  return res.status(200).json(order);
}

async function deleteOrder(req, res) {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: '유효하지 않은 주문 ID입니다.' });
  }

  const order = await Order.findOne({
    _id: req.params.id,
    user: req.auth.userId,
  });

  if (!order) {
    return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
  }

  if (order.status !== 'pending') {
    return res.status(409).json({ message: '접수 대기 중인 주문만 삭제할 수 있습니다.' });
  }

  await order.deleteOne();
  return res.status(200).json(order);
}

function handleOrderError(error, req, res, next) {
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      message: '주문 정보가 올바르지 않습니다.',
      errors: Object.values(error.errors).map((validationError) => validationError.message),
    });
  }

  if (error.code === 11000) {
    const duplicateField = Object.keys(error.keyPattern || {})[0] || '';

    if (duplicateField.startsWith('payment.')) {
      return res.status(409).json({ message: '이미 처리된 주문입니다.' });
    }

    if (duplicateField === 'orderNumber') {
      return res.status(409).json({ message: '주문 번호가 중복되었습니다. 다시 시도해 주세요.' });
    }
  }

  return next(error);
}

module.exports = {
  createOrder,
  getPaymentConfiguration,
  getOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  handleOrderError,
  createOrderNumber,
  validatePayment,
};
