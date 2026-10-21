const test = require('node:test');
const assert = require('node:assert/strict');

const Product = require('../src/models/product.model');
const {
  getProducts,
  updateProduct,
  deleteProduct,
} = require('../src/controllers/product.controller');

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

test('상품 목록은 한 페이지에 최대 10개를 반환한다', async () => {
  const originals = {
    countDocuments: Product.countDocuments,
    distinct: Product.distinct,
    aggregate: Product.aggregate,
    find: Product.find,
  };
  let countCall = 0;
  let requestedLimit = 0;

  Product.countDocuments = async () => {
    countCall += 1;
    return countCall === 1 ? 5 : countCall === 2 ? 5 : 2;
  };
  Product.distinct = async () => ['상의', '하의'];
  Product.aggregate = async () => [{ averagePrice: 15000 }];
  Product.find = () => ({
    sort() { return this; },
    skip() { return this; },
    limit(limit) {
      requestedLimit = limit;
      return Promise.resolve(Array.from({ length: 5 }, (_, index) => ({ name: `상품 ${index + 1}` })));
    },
  });

  const request = { query: { page: '2' } };
  const response = createResponse();

  try {
    await getProducts(request, response);
    assert.equal(response.statusCode, 200);
    assert.equal(requestedLimit, 10);
    assert.equal(response.body.products.length, 5);
    assert.deepEqual(response.body.pagination, {
      page: 1,
      pageSize: 10,
      total: 5,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    });
  } finally {
    Object.assign(Product, originals);
  }
});

test('상품 수정은 허용된 필드만 저장하고 갱신된 상품을 반환한다', async () => {
  const originalFindByIdAndUpdate = Product.findByIdAndUpdate;
  let receivedUpdate;
  let receivedOptions;
  Product.findByIdAndUpdate = async (id, update, options) => {
    receivedUpdate = update;
    receivedOptions = options;
    return { _id: id, ...update };
  };

  const request = {
    params: { id: '507f1f77bcf86cd799439011' },
    body: {
      name: '수정 상품',
      price: 20000,
      spinImages: ['https://example.com/frame-01.webp', 'https://example.com/frame-02.webp'],
      unexpected: '제외',
    },
  };
  const response = createResponse();

  try {
    await updateProduct(request, response);
    assert.equal(response.statusCode, 200);
    assert.deepEqual(receivedUpdate, {
      name: '수정 상품',
      price: 20000,
      spinImages: ['https://example.com/frame-01.webp', 'https://example.com/frame-02.webp'],
    });
    assert.deepEqual(receivedOptions, { new: true, runValidators: true });
  } finally {
    Product.findByIdAndUpdate = originalFindByIdAndUpdate;
  }
});

test('상품 삭제는 삭제된 상품 정보를 반환한다', async () => {
  const originalFindByIdAndDelete = Product.findByIdAndDelete;
  Product.findByIdAndDelete = async (id) => ({ _id: id, name: '삭제 상품' });

  const request = { params: { id: '507f1f77bcf86cd799439011' } };
  const response = createResponse();

  try {
    await deleteProduct(request, response);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.name, '삭제 상품');
  } finally {
    Product.findByIdAndDelete = originalFindByIdAndDelete;
  }
});
