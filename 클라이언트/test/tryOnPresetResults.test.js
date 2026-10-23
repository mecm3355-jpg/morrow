import assert from 'node:assert/strict'
import test from 'node:test'
import { getPresetMannequinOutfit } from '../src/utils/tryOnPresetResults.js'

const products = {
  top: { slot: 'top', image: '/products/around/top-front.png' },
  cardigan: { slot: 'top', image: '/products/around/cardigan-front.png' },
  bottom: { slot: 'bottom', image: '/products/around/bottom-front.png' },
  cargo: { slot: 'bottom', image: '/products/around/cargo-front.png' },
  bag: { slot: 'accessory', image: '/products/around/accessory-front.png' },
  cap: { slot: 'headwear', image: '/products/around/cap-front.png' },
}

test('기본 마네킹의 사전 생성 코디 경로를 조합한다', () => {
  assert.equal(
    getPresetMannequinOutfit([products.top, products.bottom, products.bag, products.cap]),
    '/products/around/outfit-top-bottom-bag-cap.png',
  )
  assert.equal(
    getPresetMannequinOutfit([products.cardigan, products.cargo, products.cap]),
    '/products/around/outfit-cardigan-cargo-cap.png',
  )
})

test('상의와 하의가 모두 있어야 사전 생성 코디를 사용한다', () => {
  assert.equal(getPresetMannequinOutfit([products.top]), '')
  assert.equal(getPresetMannequinOutfit([products.bag, products.cap]), '')
})

test('등록되지 않은 상품이나 슬롯 중복은 사전 생성 코디로 처리하지 않는다', () => {
  assert.equal(getPresetMannequinOutfit([
    products.top,
    { slot: 'top', image: '/products/around/unknown-front.png' },
    products.bottom,
  ]), '')
  assert.equal(getPresetMannequinOutfit([products.top, products.cardigan, products.bottom]), '')
})
