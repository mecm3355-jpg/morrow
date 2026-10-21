const assert = require('node:assert/strict');
const test = require('node:test');
const mongoose = require('mongoose');

const Cart = require('../src/models/cart.model');

function createIds() {
  return {
    user: new mongoose.Types.ObjectId(),
    product: new mongoose.Types.ObjectId(),
  };
}

test('유효한 장바구니는 검증을 통과한다', async () => {
  const { user, product } = createIds();
  const cart = new Cart({
    user,
    items: [{ product, selectedOption: 'M', price: 128000, quantity: 2 }],
  });

  await assert.doesNotReject(cart.validate());
});

test('장바구니 상품 수량은 정수여야 한다', async () => {
  const { user, product } = createIds();
  const cart = new Cart({
    user,
    items: [{ product, price: 128000, quantity: 1.5 }],
  });

  await assert.rejects(cart.validate(), (validationError) => {
    assert.ok(validationError.errors['items.0.quantity']);
    return true;
  });
});

test('같은 상품과 옵션은 중복으로 담을 수 없다', async () => {
  const { user, product } = createIds();
  const cart = new Cart({
    user,
    items: [
      { product, selectedOption: 'M', price: 128000, quantity: 1 },
      { product, selectedOption: 'M', price: 128000, quantity: 2 },
    ],
  });

  await assert.rejects(cart.validate(), (validationError) => {
    assert.ok(validationError.errors.items);
    return true;
  });
});

test('같은 상품이라도 옵션이 다르면 각각 담을 수 있다', async () => {
  const { user, product } = createIds();
  const cart = new Cart({
    user,
    items: [
      { product, selectedOption: 'M', price: 128000, quantity: 1 },
      { product, selectedOption: 'L', price: 128000, quantity: 1 },
    ],
  });

  await assert.doesNotReject(cart.validate());
});

test('장바구니 상품 가격은 0원 이상의 정수여야 한다', async () => {
  const { user, product } = createIds();
  const cart = new Cart({
    user,
    items: [{ product, price: 12900.5, quantity: 1 }],
  });

  await assert.rejects(cart.validate(), (validationError) => {
    assert.ok(validationError.errors['items.0.price']);
    return true;
  });
});
