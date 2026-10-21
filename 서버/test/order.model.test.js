const assert = require('node:assert/strict');
const test = require('node:test');
const mongoose = require('mongoose');

const Order = require('../src/models/order.model');

function validOrder(overrides = {}) {
  return new Order({
    orderNumber: 'ORD-20261022-000001',
    user: new mongoose.Types.ObjectId(),
    items: [{
      product: new mongoose.Types.ObjectId(),
      selectedOption: 'M',
      unitPrice: 32000,
      quantity: 2,
    }],
    shippingAddress: {
      recipientName: '홍길동',
      phone: '010-1234-5678',
      postalCode: '06236',
      address1: '서울시 강남구 테헤란로 1',
      address2: '101호',
    },
    amounts: {
      discountAmount: 5000,
    },
    payment: {
      impUid: 'imp_test_000001',
      merchantUid: 'order_test_000001',
      payMethod: 'card',
      pgProvider: 'html5_inicis',
      status: 'paid',
      amount: 59000,
    },
    ...overrides,
  });
}

test('주문 상품별 금액과 최종 주문 금액을 계산한다', async () => {
  const order = validOrder();

  await order.validate();

  assert.equal(order.items[0].lineAmount, 64000);
  assert.equal(order.amounts.itemsAmount, 64000);
  assert.equal(order.amounts.totalAmount, 59000);
});

test('주문 상품은 한 개 이상이어야 한다', async () => {
  const order = validOrder({ items: [] });

  await assert.rejects(order.validate(), (validationError) => {
    assert.ok(validationError.errors.items);
    return true;
  });
});

test('주문 당시 상품 단가는 필수다', async () => {
  const order = validOrder();
  order.items[0].unitPrice = undefined;

  await assert.rejects(order.validate(), (validationError) => {
    assert.ok(validationError.errors['items.0.unitPrice']);
    return true;
  });
});

test('할인 금액은 상품 금액을 넘을 수 없다', async () => {
  const order = validOrder({
    amounts: { discountAmount: 100000 },
  });

  await assert.rejects(order.validate(), (validationError) => {
    assert.ok(validationError.errors.amounts);
    return true;
  });
});
