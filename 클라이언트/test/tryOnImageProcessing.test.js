import test from 'node:test'
import assert from 'node:assert/strict'

import { removeLightNeutralBackground } from '../src/utils/tryOnImageProcessing.js'

test('밝은 무채색 모서리 배경은 투명화하고 어두운 상품 픽셀은 보존한다', () => {
  const pixels = new Uint8ClampedArray([
    255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
    255, 255, 255, 255, 20, 20, 20, 255, 255, 255, 255, 255,
    255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  ])

  assert.equal(removeLightNeutralBackground(pixels, 3, 3), true)
  assert.equal(pixels[3], 0)
  assert.equal(pixels[19], 255)
})

test('색이 있는 배경은 자동 제거하지 않는다', () => {
  const pixels = new Uint8ClampedArray([
    30, 80, 160, 255, 30, 80, 160, 255, 30, 80, 160, 255,
    30, 80, 160, 255, 20, 20, 20, 255, 30, 80, 160, 255,
    30, 80, 160, 255, 30, 80, 160, 255, 30, 80, 160, 255,
  ])

  assert.equal(removeLightNeutralBackground(pixels, 3, 3), false)
  assert.deepEqual(
    [...pixels].filter((_, index) => index % 4 === 3),
    [255, 255, 255, 255, 255, 255, 255, 255, 255],
  )
})

test('상품 내부의 흰색은 어두운 윤곽으로 배경과 분리되면 보존한다', () => {
  const pixels = new Uint8ClampedArray(5 * 5 * 4)
  for (let index = 0; index < 25; index += 1) {
    const offset = index * 4
    pixels.set([255, 255, 255, 255], offset)
  }

  for (const index of [6, 7, 8, 11, 13, 16, 17, 18]) {
    pixels.set([20, 20, 20, 255], index * 4)
  }

  assert.equal(removeLightNeutralBackground(pixels, 5, 5), true)
  assert.equal(pixels[3], 0)
  assert.equal(pixels[(12 * 4) + 3], 255)
})
