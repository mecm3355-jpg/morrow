import test from 'node:test'
import assert from 'node:assert/strict'

import { getPaginationItems } from '../src/utils/pagination.js'

test('7페이지 이하는 모든 페이지 번호를 표시한다', () => {
  assert.deepEqual(getPaginationItems(2, 4), [1, 2, 3, 4])
})

test('페이지가 많으면 현재 페이지 주변과 처음·끝만 표시한다', () => {
  assert.deepEqual(
    getPaginationItems(10, 20),
    [1, 'ellipsis-1', 9, 10, 11, 'ellipsis-11', 20],
  )
})

test('첫 페이지 근처에서도 중복 없이 축약한다', () => {
  assert.deepEqual(
    getPaginationItems(1, 12),
    [1, 2, 'ellipsis-2', 12],
  )
})
