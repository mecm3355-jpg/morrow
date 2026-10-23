const CACHE_DB_NAME = 'morrow-virtual-try-on'
const CACHE_STORE_NAME = 'results'
const CACHE_DB_VERSION = 1
const MAX_RESULT_CACHE_ENTRIES = 16
const RESULT_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000
const memoryCache = new Map()
let cacheDatabasePromise

function rememberResult(key, blob) {
  memoryCache.delete(key)
  memoryCache.set(key, blob)
  while (memoryCache.size > MAX_RESULT_CACHE_ENTRIES) {
    memoryCache.delete(memoryCache.keys().next().value)
  }
}

function openCacheDatabase() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  if (cacheDatabasePromise) return cacheDatabasePromise

  cacheDatabasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(CACHE_DB_NAME, CACHE_DB_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(CACHE_STORE_NAME)) {
        request.result.createObjectStore(CACHE_STORE_NAME, { keyPath: 'key' })
      }
    }
    request.onsuccess = () => {
      request.result.onversionchange = () => {
        request.result.close()
        cacheDatabasePromise = undefined
      }
      resolve(request.result)
    }
    request.onerror = () => {
      cacheDatabasePromise = undefined
      reject(request.error)
    }
  })
  return cacheDatabasePromise
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error)
    transaction.onerror = () => reject(transaction.error)
  })
}

async function deletePersistedResult(key) {
  const database = await openCacheDatabase()
  if (!database) return
  const transaction = database.transaction(CACHE_STORE_NAME, 'readwrite')
  transaction.objectStore(CACHE_STORE_NAME).delete(key)
  await transactionDone(transaction)
}

async function getTryOnResult(key) {
  const memoryResult = memoryCache.get(key)
  if (memoryResult) {
    rememberResult(key, memoryResult)
    return memoryResult
  }

  try {
    const database = await openCacheDatabase()
    if (!database) return null
    const transaction = database.transaction(CACHE_STORE_NAME, 'readonly')
    const cached = await requestResult(transaction.objectStore(CACHE_STORE_NAME).get(key))
    const isExpired = !cached?.updatedAt || Date.now() - cached.updatedAt > RESULT_CACHE_TTL_MS
    const isImageBlob = typeof Blob !== 'undefined' && cached?.blob instanceof Blob && cached.blob.size > 0
    if (isExpired || !isImageBlob) {
      if (cached) await deletePersistedResult(key)
      return null
    }
    rememberResult(key, cached.blob)
    return cached.blob
  } catch {
    return null
  }
}

async function putTryOnResult(key, blob) {
  if (typeof Blob === 'undefined' || !(blob instanceof Blob) || !blob.size) return
  rememberResult(key, blob)

  try {
    const database = await openCacheDatabase()
    if (!database) return
    const writeTransaction = database.transaction(CACHE_STORE_NAME, 'readwrite')
    writeTransaction.objectStore(CACHE_STORE_NAME).put({ key, blob, updatedAt: Date.now() })
    await transactionDone(writeTransaction)

    const readTransaction = database.transaction(CACHE_STORE_NAME, 'readonly')
    const entries = await requestResult(readTransaction.objectStore(CACHE_STORE_NAME).getAll())
    const sortedEntries = entries.sort((left, right) => right.updatedAt - left.updatedAt)
    const expiredKeys = sortedEntries
      .filter((entry) => Date.now() - entry.updatedAt > RESULT_CACHE_TTL_MS)
      .map((entry) => entry.key)
    const overflowKeys = sortedEntries
      .filter((entry) => !expiredKeys.includes(entry.key))
      .slice(MAX_RESULT_CACHE_ENTRIES)
      .map((entry) => entry.key)
    const keysToDelete = [...new Set([...expiredKeys, ...overflowKeys])]
    if (keysToDelete.length) {
      const pruneTransaction = database.transaction(CACHE_STORE_NAME, 'readwrite')
      const pruneStore = pruneTransaction.objectStore(CACHE_STORE_NAME)
      keysToDelete.forEach((entryKey) => pruneStore.delete(entryKey))
      await transactionDone(pruneTransaction)
    }
  } catch {
    // 메모리 캐시는 그대로 유지해 IndexedDB를 지원하지 않는 환경에서도 재사용한다.
  }
}

async function deleteTryOnResult(key) {
  memoryCache.delete(key)
  try {
    await deletePersistedResult(key)
  } catch {
    // 캐시 삭제 실패는 착장 화면 이용을 막지 않는다.
  }
}

function clearMemoryTryOnCache() {
  memoryCache.clear()
}

export {
  clearMemoryTryOnCache,
  deleteTryOnResult,
  getTryOnResult,
  putTryOnResult,
}
