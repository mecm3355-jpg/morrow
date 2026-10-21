const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const Order = require('../src/models/order.model');
const Product = require('../src/models/product.model');
const {
  createOrder,
  getPaymentConfiguration,
  getOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
} = require('../src/controllers/order.controller');

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function createPortOneFetch(paymentOverrides = {}, onRequest = () => {}) {
  return async (url) => {
    onRequest(url);

    if (url.endsWith('/users/getToken')) {
      return {
        ok: true,
        json: async () => ({ code: 0, response: { access_token: 'test-access-token' } }),
      };
    }

    return {
      ok: true,
      json: async () => ({
        code: 0,
        response: {
          imp_uid: 'imp_test_000001',
          merchant_uid: 'order_test_000001',
          amount: 64000,
          status: 'paid',
          pay_method: 'card',
          pg_provider: 'html5_inicis',
          paid_at: 1792627200,
          receipt_url: 'https://example.com/receipt',
          ...paymentOverrides,
        },
      }),
    };
  };
}

test('주문 생성은 요청 가격을 무시하고 상품 DB 가격을 사용한다', async () => {
  const productId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  const originals = {
    find: Product.find,
    exists: Order.exists,
    create: Order.create,
    fetch: globalThis.fetch,
    apiKey: process.env.PORTONE_API_KEY,
    apiSecret: process.env.PORTONE_API_SECRET,
    merchantCode: process.env.PORTONE_MERCHANT_CODE,
    includeSandboxPayments: process.env.PORTONE_INCLUDE_SANDBOX_PAYMENTS,
  };
  let createdOrder;
  const portOneRequestUrls = [];

  process.env.PORTONE_API_KEY = 'test-api-key';
  process.env.PORTONE_API_SECRET = 'test-api-secret';
  process.env.PORTONE_MERCHANT_CODE = 'impTestMerchant';
  process.env.PORTONE_INCLUDE_SANDBOX_PAYMENTS = 'true';
  globalThis.fetch = createPortOneFetch({}, (url) => portOneRequestUrls.push(url));
  Order.exists = async () => null;
  Product.find = () => ({
    select: async () => [{ _id: productId, price: 32000 }],
  });
  Order.create = async (data) => {
    createdOrder = data;
    return {
      ...data,
      async populate() { return this; },
    };
  };

  const request = {
    auth: { userId: userId.toString() },
    body: {
      imp_uid: 'imp_test_000001',
      merchant_uid: 'order_test_000001',
      merchantCode: 'impTestMerchant',
      items: [{ productId: productId.toString(), selectedOption: 'M', quantity: 2, unitPrice: 1 }],
      shippingAddress: {
        recipientName: '홍길동',
        phone: '010-1234-5678',
        postalCode: '06236',
        address1: '서울시 강남구 테헤란로 1',
      },
      discountAmount: 30000,
    },
  };
  const response = createResponse();

  try {
    await createOrder(request, response);
    assert.equal(response.statusCode, 201);
    assert.equal(createdOrder.items[0].unitPrice, 32000);
    assert.equal(createdOrder.amounts.discountAmount, 0);
    assert.equal(createdOrder.user, userId.toString());
    assert.equal(createdOrder.payment.amount, 64000);
    assert.equal(createdOrder.payment.status, 'paid');
    assert.equal(createdOrder.status, 'confirmed');
    assert.equal(
      portOneRequestUrls.some((url) => url.endsWith(
        '/payments/imp_test_000001?include_sandbox=true',
      )),
      true,
    );
  } finally {
    Product.find = originals.find;
    Order.exists = originals.exists;
    Order.create = originals.create;
    globalThis.fetch = originals.fetch;
    if (originals.apiKey === undefined) delete process.env.PORTONE_API_KEY;
    else process.env.PORTONE_API_KEY = originals.apiKey;
    if (originals.apiSecret === undefined) delete process.env.PORTONE_API_SECRET;
    else process.env.PORTONE_API_SECRET = originals.apiSecret;
    if (originals.merchantCode === undefined) delete process.env.PORTONE_MERCHANT_CODE;
    else process.env.PORTONE_MERCHANT_CODE = originals.merchantCode;
    if (originals.includeSandboxPayments === undefined) {
      delete process.env.PORTONE_INCLUDE_SANDBOX_PAYMENTS;
    } else {
      process.env.PORTONE_INCLUDE_SANDBOX_PAYMENTS = originals.includeSandboxPayments;
    }
  }
});

test('같은 결제 번호로 생성된 주문이 있으면 결제 조회 전에 차단한다', async () => {
  const originalExists = Order.exists;
  const originalFetch = globalThis.fetch;
  const originalMerchantCode = process.env.PORTONE_MERCHANT_CODE;
  let paymentRequested = false;

  process.env.PORTONE_MERCHANT_CODE = 'impTestMerchant';
  Order.exists = async () => ({ _id: new mongoose.Types.ObjectId() });
  globalThis.fetch = async () => {
    paymentRequested = true;
    throw new Error('호출되면 안 됩니다.');
  };

  const response = createResponse();

  try {
    await createOrder({
      auth: { userId: new mongoose.Types.ObjectId().toString() },
      body: {
        imp_uid: 'imp_test_000001',
        merchant_uid: 'order_test_000001',
        merchantCode: 'impTestMerchant',
        items: [{
          productId: new mongoose.Types.ObjectId().toString(),
          selectedOption: '',
          quantity: 1,
        }],
      },
    }, response);

    assert.equal(response.statusCode, 409);
    assert.equal(response.body.message, '이미 처리된 주문입니다.');
    assert.equal(paymentRequested, false);
  } finally {
    Order.exists = originalExists;
    globalThis.fetch = originalFetch;
    if (originalMerchantCode === undefined) delete process.env.PORTONE_MERCHANT_CODE;
    else process.env.PORTONE_MERCHANT_CODE = originalMerchantCode;
  }
});

test('포트원 결제 금액과 DB 상품 금액이 다르면 주문을 생성하지 않는다', async () => {
  const productId = new mongoose.Types.ObjectId();
  const originals = {
    find: Product.find,
    exists: Order.exists,
    create: Order.create,
    fetch: globalThis.fetch,
    apiKey: process.env.PORTONE_API_KEY,
    apiSecret: process.env.PORTONE_API_SECRET,
    merchantCode: process.env.PORTONE_MERCHANT_CODE,
  };
  let orderCreated = false;

  process.env.PORTONE_API_KEY = 'test-api-key';
  process.env.PORTONE_API_SECRET = 'test-api-secret';
  process.env.PORTONE_MERCHANT_CODE = 'impTestMerchant';
  globalThis.fetch = createPortOneFetch({ amount: 100 });
  Order.exists = async () => null;
  Product.find = () => ({
    select: async () => [{ _id: productId, price: 32000 }],
  });
  Order.create = async () => {
    orderCreated = true;
  };

  const response = createResponse();

  try {
    await assert.rejects(
      createOrder({
        auth: { userId: new mongoose.Types.ObjectId().toString() },
        body: {
          imp_uid: 'imp_test_000001',
          merchant_uid: 'order_test_000001',
          merchantCode: 'impTestMerchant',
          items: [{ productId: productId.toString(), quantity: 2 }],
          shippingAddress: {
            recipientName: '홍길동',
            phone: '010-1234-5678',
            postalCode: '06236',
            address1: '서울시 강남구 테헤란로 1',
          },
        },
      }, response),
      (error) => error.status === 400 && error.message.includes('결제 금액'),
    );
    assert.equal(orderCreated, false);
  } finally {
    Product.find = originals.find;
    Order.exists = originals.exists;
    Order.create = originals.create;
    globalThis.fetch = originals.fetch;
    if (originals.apiKey === undefined) delete process.env.PORTONE_API_KEY;
    else process.env.PORTONE_API_KEY = originals.apiKey;
    if (originals.apiSecret === undefined) delete process.env.PORTONE_API_SECRET;
    else process.env.PORTONE_API_SECRET = originals.apiSecret;
    if (originals.merchantCode === undefined) delete process.env.PORTONE_MERCHANT_CODE;
    else process.env.PORTONE_MERCHANT_CODE = originals.merchantCode;
  }
});

test('결제 전 점검은 클라이언트와 서버의 고객사 식별코드 불일치를 차단한다', async () => {
  const originalMerchantCode = process.env.PORTONE_MERCHANT_CODE;
  const originalFetch = globalThis.fetch;
  let tokenRequested = false;

  process.env.PORTONE_MERCHANT_CODE = 'impServerMerchant';
  globalThis.fetch = async () => {
    tokenRequested = true;
    throw new Error('호출되면 안 됩니다.');
  };
  const response = createResponse();

  try {
    await getPaymentConfiguration({ query: { merchantCode: 'impClientMerchant' } }, response);
    assert.equal(response.statusCode, 409);
    assert.match(response.body.message, /일치하지 않습니다/);
    assert.equal(tokenRequested, false);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalMerchantCode === undefined) delete process.env.PORTONE_MERCHANT_CODE;
    else process.env.PORTONE_MERCHANT_CODE = originalMerchantCode;
  }
});

test('결제 전 점검은 동일한 고객사 식별코드와 유효한 V1 API 키를 확인한다', async () => {
  const originals = {
    fetch: globalThis.fetch,
    apiKey: process.env.PORTONE_API_KEY,
    apiSecret: process.env.PORTONE_API_SECRET,
    merchantCode: process.env.PORTONE_MERCHANT_CODE,
  };

  process.env.PORTONE_API_KEY = 'test-api-key';
  process.env.PORTONE_API_SECRET = 'test-api-secret';
  process.env.PORTONE_MERCHANT_CODE = 'impTestMerchant';
  globalThis.fetch = createPortOneFetch();
  const response = createResponse();

  try {
    await getPaymentConfiguration({ query: { merchantCode: 'impTestMerchant' } }, response);
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, { merchantCode: 'impTestMerchant', ready: true });
  } finally {
    globalThis.fetch = originals.fetch;
    if (originals.apiKey === undefined) delete process.env.PORTONE_API_KEY;
    else process.env.PORTONE_API_KEY = originals.apiKey;
    if (originals.apiSecret === undefined) delete process.env.PORTONE_API_SECRET;
    else process.env.PORTONE_API_SECRET = originals.apiSecret;
    if (originals.merchantCode === undefined) delete process.env.PORTONE_MERCHANT_CODE;
    else process.env.PORTONE_MERCHANT_CODE = originals.merchantCode;
  }
});

test('주문 목록은 로그인한 사용자의 주문만 조회한다', async () => {
  const userId = new mongoose.Types.ObjectId().toString();
  const originals = { countDocuments: Order.countDocuments, find: Order.find };
  let countFilter;
  let findFilter;

  Order.countDocuments = async (filter) => {
    countFilter = filter;
    return 1;
  };
  Order.find = (filter) => {
    findFilter = filter;
    const query = {
      sort() { return this; },
      skip() { return this; },
      limit() { return this; },
      populate: async () => [{ orderNumber: 'ORD-TEST' }],
    };
    return query;
  };

  const response = createResponse();

  try {
    await getOrders({ auth: { userId }, query: {} }, response);
    assert.equal(response.statusCode, 200);
    assert.deepEqual(countFilter, { user: userId });
    assert.deepEqual(findFilter, { user: userId });
    assert.equal(response.body.orders.length, 1);
  } finally {
    Order.countDocuments = originals.countDocuments;
    Order.find = originals.find;
  }
});

test('주문 상세는 로그인한 사용자의 주문만 조회한다', async () => {
  const orderId = new mongoose.Types.ObjectId().toString();
  const userId = new mongoose.Types.ObjectId().toString();
  const originalFindOne = Order.findOne;
  let receivedFilter;
  const expectedOrder = { _id: orderId, orderNumber: 'ORD-DETAIL' };

  Order.findOne = (filter) => {
    receivedFilter = filter;
    return {
      populate: async () => expectedOrder,
    };
  };

  const response = createResponse();

  try {
    await getOrderById({ params: { id: orderId }, auth: { userId } }, response);
    assert.equal(response.statusCode, 200);
    assert.deepEqual(receivedFilter, { _id: orderId, user: userId });
    assert.equal(response.body, expectedOrder);
  } finally {
    Order.findOne = originalFindOne;
  }
});

test('접수 대기 중인 본인 주문의 배송 메모를 수정한다', async () => {
  const originalFindOne = Order.findOne;
  let saved = false;
  const order = {
    status: 'pending',
    shippingAddress: { set() {} },
    deliveryMemo: '',
    async save() { saved = true; },
    async populate() { return this; },
  };
  Order.findOne = async () => order;
  const response = createResponse();

  try {
    await updateOrder({
      auth: { userId: new mongoose.Types.ObjectId().toString() },
      params: { id: new mongoose.Types.ObjectId().toString() },
      body: { deliveryMemo: '문 앞에 놓아주세요.' },
    }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(order.deliveryMemo, '문 앞에 놓아주세요.');
    assert.equal(saved, true);
  } finally {
    Order.findOne = originalFindOne;
  }
});

test('진행 중인 주문은 삭제할 수 없다', async () => {
  const originalFindOne = Order.findOne;
  Order.findOne = async () => ({ status: 'shipped' });
  const response = createResponse();

  try {
    await deleteOrder({
      auth: { userId: new mongoose.Types.ObjectId().toString() },
      params: { id: new mongoose.Types.ObjectId().toString() },
    }, response);

    assert.equal(response.statusCode, 409);
  } finally {
    Order.findOne = originalFindOne;
  }
});
