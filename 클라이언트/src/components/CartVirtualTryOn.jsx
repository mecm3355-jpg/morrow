import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getStoredAuth } from '../utils/authStorage'
import {
  createAiPersonReference,
  createOutfitBoard,
  createSingleProductReference,
} from '../utils/tryOnImageProcessing'
import './VirtualTryOn.css'
import './CartVirtualTryOn.css'

const DEFAULT_MANNEQUIN_URL = '/products/around/mannequin-front.png'
const MAX_PHOTO_SIZE = 10 * 1024 * 1024
const MAX_RESULT_CACHE_ENTRIES = 8
const RESULT_CACHE_VERSION = 'binary-v2-product-fidelity'
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const resultBlobCache = new Map()

function getCachedResult(key) {
  const blob = resultBlobCache.get(key)
  if (!blob) return null
  resultBlobCache.delete(key)
  resultBlobCache.set(key, blob)
  return blob
}

function cacheResult(key, blob) {
  resultBlobCache.delete(key)
  resultBlobCache.set(key, blob)
  while (resultBlobCache.size > MAX_RESULT_CACHE_ENTRIES) {
    resultBlobCache.delete(resultBlobCache.keys().next().value)
  }
}

function getProductKey(item) {
  return String(item.product?._id || item.product || item._id)
}

function getProductSlot(product) {
  if (product.category === '상의') return 'top'
  if (product.category === '하의') return 'bottom'
  if (product.category === '악세사리' && /(캡|모자|hat|cap)/i.test(product.name || '')) return 'headwear'
  return 'accessory'
}

function createPlacements(products) {
  const occupiedSlots = new Set()
  return products.reduce((result, product) => {
    const visible = !occupiedSlots.has(product.slot)
    occupiedSlots.add(product.slot)
    result[product.key] = { visible }
    return result
  }, {})
}

function CartVirtualTryOn({ items, isOpen, onClose }) {
  const products = useMemo(() => {
    const uniqueProducts = new Map()
    for (const item of items) {
      const product = item.product
      if (!product?.image) continue
      const key = getProductKey(item)
      if (!uniqueProducts.has(key)) {
        uniqueProducts.set(key, { ...product, key, slot: getProductSlot(product) })
      }
    }
    return [...uniqueProducts.values()]
  }, [items])
  const [placements, setPlacements] = useState(() => createPlacements(products))
  const [selectedId, setSelectedId] = useState(products[0]?.key || '')
  const [photoUrl, setPhotoUrl] = useState(DEFAULT_MANNEQUIN_URL)
  const [photoCacheKey, setPhotoCacheKey] = useState('mannequin:v1')
  const [photoName, setPhotoName] = useState('기본 마네킹')
  const [isUsingMannequin, setIsUsingMannequin] = useState(true)
  const [error, setError] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [dragPreview, setDragPreview] = useState(null)
  const [aiImageUrl, setAiImageUrl] = useState('')
  const [aiGenerationLabel, setAiGenerationLabel] = useState('')
  const [isAiRevealing, setIsAiRevealing] = useState(false)
  const isAiGenerating = Boolean(aiGenerationLabel)
  const objectUrlRef = useRef('')
  const aiImageObjectUrlRef = useRef('')
  const activeResultKeyRef = useRef('')
  const generationInFlightRef = useRef(false)
  const productDragRef = useRef(null)
  const suppressClickRef = useRef(false)
  const closeButtonRef = useRef(null)

  function clearAiResult() {
    if (aiImageObjectUrlRef.current) {
      URL.revokeObjectURL(aiImageObjectUrlRef.current)
      aiImageObjectUrlRef.current = ''
    }
    setAiImageUrl('')
    setIsAiRevealing(false)
    activeResultKeyRef.current = ''
  }

  function showAiResult(blob, resultKey) {
    if (aiImageObjectUrlRef.current) URL.revokeObjectURL(aiImageObjectUrlRef.current)
    aiImageObjectUrlRef.current = URL.createObjectURL(blob)
    activeResultKeyRef.current = resultKey
    setIsAiRevealing(true)
    setAiImageUrl(aiImageObjectUrlRef.current)
  }

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    if (aiImageObjectUrlRef.current) URL.revokeObjectURL(aiImageObjectUrlRef.current)
  }, [])

  useEffect(() => {
    if (!isOpen) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    function handleEscape(event) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  function selectProduct(product) {
    clearAiResult()
    setSelectedId(product.key)
    setPlacements((current) => Object.fromEntries(
      products.map((candidate) => [
        candidate.key,
        {
          ...current[candidate.key],
          visible: candidate.slot === product.slot
            ? candidate.key === product.key
            : current[candidate.key]?.visible,
        },
      ]),
    ))
  }

  function toggleProduct(product) {
    if (placements[product.key]?.visible) {
      clearAiResult()
      setPlacements((current) => ({
        ...current,
        [product.key]: { visible: false },
      }))
      return
    }
    selectProduct(product)
  }

  function handleProductPointerDown(event, product) {
    if (generationInFlightRef.current) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    productDragRef.current = {
      pointerId: event.pointerId,
      product,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
    }
    setSelectedId(product.key)
  }

  function isPointOverStage(clientX, clientY) {
    return Boolean(document.elementFromPoint(clientX, clientY)?.closest('.cart-tryon-stage'))
  }

  function handleProductPointerMove(event) {
    const drag = productDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY)
    if (!drag.active && distance < 7) return

    drag.active = true
    event.preventDefault()
    const overStage = isPointOverStage(event.clientX, event.clientY)
    setIsDragOver(overStage)
    setDragPreview({ product: drag.product, x: event.clientX, y: event.clientY })
  }

  function finishProductDrag(event, cancelled = false) {
    const drag = productDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (drag.active) {
      if (!cancelled && isPointOverStage(event.clientX, event.clientY)) {
        selectProduct(drag.product)
        setError('')
        void generateAiOutfit(drag.product)
      }
      suppressClickRef.current = true
      window.setTimeout(() => { suppressClickRef.current = false }, 0)
    }
    productDragRef.current = null
    setDragPreview(null)
    setIsDragOver(false)
  }

  function handleProductClick(product) {
    if (suppressClickRef.current) return
    selectProduct(product)
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 선택할 수 있습니다.')
      return
    }
    if (file.size > MAX_PHOTO_SIZE) {
      setError('10MB 이하의 이미지를 선택해 주세요.')
      return
    }

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = URL.createObjectURL(file)
    setPhotoUrl(objectUrlRef.current)
    setPhotoCacheKey(`local:${file.name}:${file.size}:${file.lastModified}`)
    setPhotoName(file.name)
    setIsUsingMannequin(false)
    clearAiResult()
    setError('')
  }

  function useDefaultMannequin() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = ''
    }
    setPhotoUrl(DEFAULT_MANNEQUIN_URL)
    setPhotoCacheKey('mannequin:v1')
    setPhotoName('기본 마네킹')
    setIsUsingMannequin(true)
    clearAiResult()
    setError('')
  }

  function resetOutfit() {
    clearAiResult()
    setPlacements(createPlacements(products))
    setSelectedId(products[0]?.key || '')
  }

  async function generateAiOutfit(singleProduct = null) {
    if (generationInFlightRef.current) return

    const auth = getStoredAuth()
    if (!auth) {
      setError('무료 AI 가상 착장은 로그인 후 사용할 수 있습니다.')
      return
    }

    const outfitProducts = singleProduct
      ? [singleProduct]
      : products.filter((product) => placements[product.key]?.visible)
    if (!outfitProducts.length) {
      setError('먼저 착용할 상품을 하나 이상 선택해 주세요.')
      return
    }

    const resultKey = JSON.stringify([
      RESULT_CACHE_VERSION,
      photoCacheKey,
      outfitProducts
        .map((product) => `${product.slot}:${product.key}:${product.image}`)
        .sort(),
    ])
    const cachedResult = getCachedResult(resultKey)
    if (cachedResult) {
      setError('')
      showAiResult(cachedResult, resultKey)
      return
    }

    generationInFlightRef.current = true
    setAiGenerationLabel(singleProduct
      ? `${singleProduct.name} 상품을 입히는 중...`
      : '선택한 코디를 한 번에 입히는 중...')
    setError('')
    try {
      const [personImage, outfitBoardImage] = await Promise.all([
        createAiPersonReference(photoUrl),
        singleProduct
          ? createSingleProductReference(singleProduct)
          : createOutfitBoard(outfitProducts),
      ])
      const response = await fetch(`${API_URL}/api/virtual-try-on`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `${auth.tokenType || 'Bearer'} ${auth.token}`,
        },
        body: JSON.stringify({
          personImage,
          outfitBoardImage,
          mode: singleProduct ? 'single' : 'outfit',
          slot: singleProduct?.slot,
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || '무료 AI 가상 착장에 실패했습니다.')
      }
      const contentType = response.headers.get('content-type') || ''
      if (!contentType.startsWith('image/')) {
        throw new Error('AI가 올바른 결과 이미지를 반환하지 않았습니다.')
      }
      const resultBlob = await response.blob()
      if (!resultBlob.size) throw new Error('AI 결과 이미지를 받지 못했습니다.')
      cacheResult(resultKey, resultBlob)
      showAiResult(resultBlob, resultKey)
    } catch (generationError) {
      setError(generationError.message || '무료 AI 가상 착장에 실패했습니다.')
    } finally {
      generationInFlightRef.current = false
      setAiGenerationLabel('')
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div className="virtual-tryon-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="virtual-tryon-dialog cart-tryon-dialog" role="dialog" aria-modal="true" aria-labelledby="cart-tryon-title">
        <header>
          <div>
            <span>FINAL OUTFIT CHECK</span>
            <h2 id="cart-tryon-title">선택한 코디 입어보기</h2>
          </div>
          <button ref={closeButtonRef} type="button" aria-label="선택한 코디 입어보기 닫기" onClick={onClose}>×</button>
        </header>

        <div className="virtual-tryon-body cart-tryon-body">
          <div
            className={`virtual-tryon-stage cart-tryon-stage${isDragOver ? ' is-drag-over' : ''}${isAiGenerating ? ' is-generating' : ''}${aiImageUrl ? ' is-ai-result' : ''}${isAiRevealing ? ' is-ai-revealing' : ''}`}
            aria-busy={isAiGenerating}
          >
            <img
              className="virtual-tryon-photo"
              src={aiImageUrl || photoUrl}
              alt={aiImageUrl ? 'AI가 생성한 선택 코디 착장' : (isUsingMannequin ? '가상 착장용 마네킹' : '선택한 착장 사진')}
              onLoad={() => {
                if (!aiImageUrl) return
                window.setTimeout(() => setIsAiRevealing(false), 80)
              }}
              onError={aiImageUrl ? () => {
                if (activeResultKeyRef.current) {
                  resultBlobCache.delete(activeResultKeyRef.current)
                }
                clearAiResult()
                setError('AI 결과 이미지를 불러오지 못했습니다. 다시 생성해 주세요.')
              } : undefined}
            />
            {isAiGenerating ? <span className="cart-tryon-ai-loading">무료 Turbo AI가 {aiGenerationLabel}</span> : null}
            {!aiImageUrl && !isAiGenerating ? <span className="virtual-tryon-drag-hint">상품을 이곳에 놓으면 해당 상품을 바로 입혀봅니다</span> : null}
          </div>

          <aside className="virtual-tryon-panel cart-tryon-panel">
            <div className="cart-tryon-summary">
              <small>장바구니 코디</small>
              <strong>{products.length}개 상품으로 코디 조합하기</strong>
              <p>드래그해 놓으면 해당 상품을 바로 입혀보고, 클릭으로 고른 상품은 아래 버튼으로 한 번에 입어봅니다.</p>
            </div>

            <div className="cart-tryon-products" aria-label="착장 상품 목록">
              {products.map((product) => {
                const placement = placements[product.key]
                const isSelected = selectedId === product.key
                return (
                  <div className={isSelected ? 'is-selected' : ''} data-product-id={product.key} data-slot={product.slot} key={product.key}>
                    <button
                      className="cart-tryon-select"
                      type="button"
                      disabled={isAiGenerating}
                      aria-pressed={isSelected}
                      onClick={() => handleProductClick(product)}
                      onPointerDown={(event) => handleProductPointerDown(event, product)}
                      onPointerMove={handleProductPointerMove}
                      onPointerUp={(event) => finishProductDrag(event)}
                      onPointerCancel={(event) => finishProductDrag(event, true)}
                      title="착장 화면으로 끌어놓아 해당 상품 바로 입어보기"
                    >
                      <img src={product.image} alt="" draggable="false" onDragStart={(event) => event.preventDefault()} />
                      <span><small>{product.category}</small><strong>{product.name}</strong></span>
                    </button>
                    <button
                      className="cart-tryon-visibility"
                      type="button"
                      disabled={isAiGenerating}
                      aria-label={`${product.name} ${placement?.visible ? 'AI 코디에서 제외' : 'AI 코디에 포함'}`}
                      aria-pressed={placement?.visible}
                      onClick={() => toggleProduct(product)}
                    >
                      {placement?.visible ? '●' : '○'}
                    </button>
                  </div>
                )
              })}
            </div>

            <label className="virtual-tryon-change-photo cart-tryon-photo-control">
              <input type="file" accept="image/*" disabled={isAiGenerating} onChange={handlePhotoChange} />
              {isUsingMannequin ? '내 사진으로 바꾸기' : '사진 바꾸기'} <small>{photoName}</small>
            </label>
            {!isUsingMannequin ? <button className="virtual-tryon-mannequin" type="button" disabled={isAiGenerating} onClick={useDefaultMannequin}>기본 마네킹으로 돌아가기</button> : null}

            <div className="cart-tryon-ai-box">
              <span aria-hidden="true">AI</span>
              <p><strong>선택한 코디 한 번에 입어보기</strong><small>Turbo AI가 선택한 상의·하의·가방·모자를 함께 입혀줍니다.</small></p>
              <button type="button" disabled={isAiGenerating} onClick={() => generateAiOutfit()}>
                {isAiGenerating ? 'AI 착장 생성 중...' : '코디 한 번에 입어보기'}
              </button>
              <small>같은 사진과 코디는 페이지를 나가기 전까지 즉시 재사용하며, 새로운 조합만 AI가 생성합니다.</small>
            </div>

            <button className="virtual-tryon-reset" type="button" disabled={isAiGenerating} onClick={resetOutfit}>AI 코디 선택 초기화</button>
            {error ? <p className="virtual-tryon-error" role="alert">{error}</p> : null}
            <div className="virtual-tryon-notice cart-tryon-notice">
              <strong>주문 전 마지막으로 확인해 보세요</strong>
              <p>AI 생성을 누르면 사진과 선택 상품 보드가 생성 처리를 위해 Hugging Face로 전송됩니다. 결과는 AI가 새로 그린 미리보기이며 실제 주름·사이즈·핏과 차이가 있습니다.</p>
            </div>
          </aside>
        </div>
        {dragPreview ? (
          <div className="cart-tryon-drag-preview" style={{ left: dragPreview.x, top: dragPreview.y }} aria-hidden="true">
            <img src={dragPreview.product.image} alt="" draggable="false" />
            <span>놓으면 바로 입어보기</span>
          </div>
        ) : null}
      </section>
    </div>,
    document.body,
  )
}

export default CartVirtualTryOn
