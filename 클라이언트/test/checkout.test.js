import assert from 'node:assert/strict'
import test from 'node:test'

import { createBuyNowCart } from '../src/utils/checkout.js'

test('바로 구매는 선택 상품만 주문용 장바구니로 만든다', () => {
  const cart = createBuyNowCart({
    _id: 'product-1',
    sku: 'TOP-001',
    name: '테스트 상의',
    price: 12000,
    category: '상의',
    image: '/products/top.png',
  }, '네이비', 2)

  assert.equal(cart.items.length, 1)
  assert.equal(cart.items[0].product._id, 'product-1')
  assert.equal(cart.items[0].selectedOption, '네이비')
  assert.equal(cart.items[0].quantity, 2)
  assert.equal(cart.items[0].currentLineTotal, 24000)
  assert.equal(cart.summary.currentTotalPrice, 24000)
})

test('바로 구매는 잘못된 상품이나 수량을 거절한다', () => {
  assert.throws(() => createBuyNowCart(null, '', 1))
  assert.throws(() => createBuyNowCart({ _id: 'product-1', price: 1000 }, '', 0))
})
