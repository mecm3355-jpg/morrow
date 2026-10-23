import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clearMemoryTryOnCache,
  deleteTryOnResult,
  getTryOnResult,
  putTryOnResult,
} from '../src/utils/tryOnResultCache.js'

test('IndexedDB가 없어도 생성 결과를 메모리에서 재사용한다', async () => {
  clearMemoryTryOnCache()
  const blob = new Blob(['result'], { type: 'image/webp' })
  await putTryOnResult('test-result', blob)

  const cached = await getTryOnResult('test-result')
  assert.equal(cached, blob)
})

test('삭제한 생성 결과는 다시 반환하지 않는다', async () => {
  clearMemoryTryOnCache()
  const blob = new Blob(['result'], { type: 'image/webp' })
  await putTryOnResult('delete-result', blob)
  await deleteTryOnResult('delete-result')

  assert.equal(await getTryOnResult('delete-result'), null)
})
