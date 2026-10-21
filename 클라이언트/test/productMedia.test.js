import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { getDraggedFrame, getSpriteFrameStyle, parseProductFrame, wrapProductFrame } from '../src/utils/productMedia.js'

test('360도 스프라이트 프레임 정보를 URL에서 읽는다', () => {
  assert.deepEqual(
    parseProductFrame('/products/around/top-turntable.png#frame=5&cols=4&rows=2'),
    {
      source: '/products/around/top-turntable.png',
      frame: 5,
      columns: 4,
      rows: 2,
      aspectRatio: '1 / 1',
    },
  )
})

test('360도 스프라이트 프레임 위치를 계산한다', () => {
  assert.deepEqual(
    getSpriteFrameStyle({ source: '/turntable.png', frame: 7, columns: 4, rows: 2, aspectRatio: '1 / 1' }),
    {
      backgroundImage: 'url("/turntable.png")',
      backgroundPosition: '100% 100%',
      backgroundSize: '400% 200%',
      aspectRatio: '1 / 1',
    },
  )
})

test('360도 상품은 프레임별 광학 중심을 보정한다', () => {
  assert.equal(
    getSpriteFrameStyle(parseProductFrame('/products/around/top-turntable.png#frame=0&cols=4&rows=2')).backgroundPosition,
    '4% 1%',
  )
  assert.equal(
    getSpriteFrameStyle(parseProductFrame('/products/around/cargo-turntable.png#frame=7&cols=4&rows=2')).backgroundPosition,
    '97.667% 98%',
  )
})

test('일반 상품 이미지 URL은 스프라이트로 처리하지 않는다', () => {
  assert.equal(parseProductFrame('/products/top.png'), null)
})

test('드래그 방향과 마지막 프레임 순환을 계산한다', () => {
  assert.equal(getDraggedFrame(0, 100, 76, 8), 2)
  assert.equal(getDraggedFrame(0, 100, 112, 8), 7)
  assert.equal(wrapProductFrame(8, 8), 0)
})

test('등록된 여섯 상품의 대표 이미지와 턴테이블 자산이 존재한다', () => {
  const files = ['top', 'cardigan', 'bottom', 'cargo', 'accessory', 'cap']
  for (const file of files) {
    assert.equal(existsSync(new URL(`../public/products/around/${file}-front.png`, import.meta.url)), true)
    assert.equal(existsSync(new URL(`../public/products/around/${file}-turntable.png`, import.meta.url)), true)
    assert.equal(existsSync(new URL(`../public/products/around/${file}-tryon.png`, import.meta.url)), true)
  }
})

test('의류와 악세사리의 모든 마네킹 입체 착장 조합이 존재한다', () => {
  const outfits = ['top-bottom', 'top-cargo', 'cardigan-bottom', 'cardigan-cargo']
  const accessories = ['', '-bag', '-cap', '-bag-cap']

  for (const outfit of outfits) {
    for (const accessory of accessories) {
      const file = `outfit-${outfit}${accessory}.png`
      assert.equal(existsSync(new URL(`../public/products/around/${file}`, import.meta.url)), true)
    }
  }
})
