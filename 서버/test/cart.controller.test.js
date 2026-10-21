const assert = require('node:assert/strict');
const test = require('node:test');

const Cart = require('../src/models/cart.model');
const Product = require('../src/models/product.model');
const {
  addCartItem,
  validateCartPrices,
} = require('../src/controllers/cart.controller');

const USER_ID = '507f1f77bcf86cd799439011';
const PRODUCT_ID = '507f1f77bcf86cd799439012';
const ITEM_ID = '507f1f77bcf86cd799439013';

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

test('장바구니 추가 시 요청 가격을 무시하고 상품 DB 가격을 저장한다', async () => {
  const originalFindById = Product.findById;
  const originalFindOne = Cart.findOne;
  const product = {
    _id: PRODUCT_ID,
    name: '테스트 상품',
    sku: 'TEST-001',
    price: 128000,
    category: '악세사리',
    image: 'https://example.com/product.jpg',
  };
  const cart = {
    _id: '507f1f77bcf86cd799439014',
    user: USER_ID,
    items: [],
    async save() {},
    async populate() {
      this.items = this.items.map((item) => ({ ...item, _id: ITEM_ID, product }));
    },
    toObject() {
      return { _id: this._id, user: this.user, items: this.items };
    },
  };

  Product.findById = () => ({ select: async () => product });
  Cart.findOne = async () => cart;

  const request = {
    auth: { userId: USER_ID },
    body: { productId: PRODUCT_ID, selectedOption: '크림', quantity: 2, price: 1 },
  };
  const response = createResponse();

  try {
    await addCartItem(request, response);
    assert.equal(response.statusCode, 201);
    assert.equal(response.body.items[0].price, 128000);
    assert.equal(response.body.items[0].lineTotal, 256000);
    assert.equal(response.body.summary.totalPrice, 256000);
  } finally {
    Product.findById = originalFindById;
    Cart.findOne = originalFindOne;
  }
});

test('결제 전 검증은 저장 가격과 현재 상품 가격의 차이를 반환한다', async () => {
  const originalFindOne = Cart.findOne;
  const cart = {
    _id: '507f1f77bcf86cd799439014',
    user: USER_ID,
    items: [{
      _id: ITEM_ID,
      product: { _id: PRODUCT_ID, price: 138000, name: '테스트 상품' },
      selectedOption: '크림',
      price: 128000,
      quantity: 1,
    }],
    async populate() {},
    toObject() {
      return { _id: this._id, user: this.user, items: this.items };
    },
  };

  Cart.findOne = async () => cart;
  const request = { auth: { userId: USER_ID } };
  const response = createResponse();

  try {
    await validateCartPrices(request, response);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.valid, false);
    assert.deepEqual(response.body.priceChanges, [{
      itemId: ITEM_ID,
      productId: PRODUCT_ID,
      previousPrice: 128000,
      currentPrice: 138000,
    }]);
    assert.equal(response.body.cart.summary.currentTotalPrice, 138000);
  } finally {
    Cart.findOne = originalFindOne;
  }
});
