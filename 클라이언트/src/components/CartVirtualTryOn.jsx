import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getStoredAuth } from '../utils/authStorage'
import {
  createAiPersonReference,
  createBrowserCutout,
  createOutfitBoard,
} from '../utils/tryOnImageProcessing'
import './VirtualTryOn.css'
import './CartVirtualTryOn.css'

const DEFAULT_MANNEQUIN_URL = '/products/around/mannequin-front.png'
const MAX_PHOTO_SIZE = 10 * 1024 * 1024
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const TRY_ON_PLACEMENTS = {
  'top-front.png': { x: 50, y: 37, width: 41, height: 43, rotation: 0, layer: 3 },
  'cardigan-front.png': { x: 50, y: 38, width: 41, height: 45, rotation: 0, layer: 3 },
  'bottom-front.png': { x: 50, y: 73, width: 31, height: 49, rotation: 0, layer: 2 },
  'cargo-front.png': { x: 50, y: 73, width: 32, height: 49, rotation: 0, layer: 2 },
  'accessory-front.png': { x: 57, y: 38, width: 29, height: 35, rotation: -3, layer: 4 },
  'cap-front.png': { x: 50, y: 9, width: 18, height: 13, rotation: 0, layer: 5 },
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

function getImageName(imageUrl = '') {
  return imageUrl.split('/').pop()?.split('?')[0] || ''
}

function getInitialPlacement(product) {
  const category = product.category
  const name = product.name || ''
  const imageName = getImageName(product.image)
  const calibratedPlacement = TRY_ON_PLACEMENTS[imageName]
  if (calibratedPlacement) return calibratedPlacement

  if (category === '하의') return { x: 50, y: 73, width: 32, height: 49, rotation: 0, layer: 2 }
  if (category === '악세사리' && /(캡|모자|hat|cap)/i.test(name)) {
    return { x: 50, y: 9, width: 18, height: 13, rotation: 0, layer: 5 }
  }
  if (category === '악세사리') return { x: 57, y: 38, width: 29, height: 35, rotation: -3, layer: 4 }
  return { x: 50, y: 37, width: 41, height: 43, rotation: 0, layer: 3 }
}

function createPlacements(products) {
  const occupiedSlots = new Set()
  return products.reduce((result, product) => {
    const visible = !occupiedSlots.has(product.slot)
    occupiedSlots.add(product.slot)
    result[product.key] = { ...getInitialPlacement(product), visible }
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
  const [photoName, setPhotoName] = useState('기본 마네킹')
  const [isUsingMannequin, setIsUsingMannequin] = useState(true)
  const [error, setError] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [dragPreview, setDragPreview] = useState(null)
  const [cutoutImages, setCutoutImages] = useState({})
  const [aiImageUrl, setAiImageUrl] = useState('')
  const [isAiGenerating, setIsAiGenerating] = useState(false)
  const objectUrlRef = useRef('')
  const cutoutUrlsRef = useRef([])
  const dragRef = useRef(null)
  const productDragRef = useRef(null)
  const suppressClickRef = useRef(false)
  const closeButtonRef = useRef(null)

  const selectedProduct = products.find((product) => product.key === selectedId) || products[0]
  const selectedPlacement = selectedProduct ? placements[selectedProduct.key] : null

  function clearAiResult() {
    setAiImageUrl('')
  }

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    cutoutUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  useEffect(() => {
    let cancelled = false

    Promise.all(products.map(async (product) => {
      try {
        const cutoutUrl = await createBrowserCutout(product.image)
        return [product.key, cutoutUrl]
      } catch {
        return [product.key, '']
      }
    })).then((entries) => {
      const nextUrls = entries.map(([, url]) => url).filter(Boolean)
      if (cancelled) {
        nextUrls.forEach((url) => URL.revokeObjectURL(url))
        return
      }
      cutoutUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
      cutoutUrlsRef.current = nextUrls
      setCutoutImages(Object.fromEntries(entries))
    })

    return () => { cancelled = true }
  }, [products])

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

  function updatePlacement(productId, values) {
    clearAiResult()
    setPlacements((current) => ({
      ...current,
      [productId]: { ...current[productId], ...values },
    }))
  }

  function showProduct(product) {
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

  function fitProduct(product) {
    clearAiResult()
    const fittedPlacement = getInitialPlacement(product)
    setSelectedId(product.key)
    setPlacements((current) => Object.fromEntries(
      products.map((candidate) => [
        candidate.key,
        candidate.key === product.key
          ? { ...fittedPlacement, visible: true }
          : {
              ...current[candidate.key],
              visible: candidate.slot === product.slot ? false : current[candidate.key]?.visible,
            },
      ]),
    ))
  }

  function toggleProduct(product) {
    clearAiResult()
    if (placements[product.key]?.visible) {
      updatePlacement(product.key, { visible: false })
      return
    }
    showProduct(product)
  }

  function handleLayerPointerDown(event, productId) {
    const placement = placements[productId]
    if (!placement?.visible) return
    setSelectedId(productId)
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      productId,
      startX: event.clientX,
      startY: event.clientY,
      placementX: placement.x,
      placementY: placement.y,
      bounds: event.currentTarget.parentElement.getBoundingClientRect(),
    }
  }

  function handleProductPointerDown(event, product) {
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
        fitProduct(drag.product)
        setError('')
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
    showProduct(product)
  }

  function handleDragMove(event) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const x = drag.placementX + ((event.clientX - drag.startX) / drag.bounds.width) * 100
    const y = drag.placementY + ((event.clientY - drag.startY) / drag.bounds.height) * 100
    updatePlacement(drag.productId, {
      x: Math.min(95, Math.max(5, x)),
      y: Math.min(95, Math.max(5, y)),
    })
  }

  function handleDragEnd(event) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null
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

  async function generateAiOutfit() {
    const auth = getStoredAuth()
    if (!auth) {
      setError('무료 AI 가상 착장은 로그인 후 사용할 수 있습니다.')
      return
    }

    const selectedBySlot = new Map()
    products.forEach((product) => {
      if (placements[product.key]?.visible && !selectedBySlot.has(product.slot)) {
        selectedBySlot.set(product.slot, product)
      }
    })
    const outfitProducts = [...selectedBySlot.values()]
    if (!outfitProducts.length) {
      setError('먼저 착용할 상품을 하나 이상 선택해 주세요.')
      return
    }

    setIsAiGenerating(true)
    setError('')
    try {
      const [personImage, outfitBoardImage] = await Promise.all([
        createAiPersonReference(photoUrl),
        createOutfitBoard(outfitProducts),
      ])
      const response = await fetch(`${API_URL}/api/virtual-try-on`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `${auth.tokenType || 'Bearer'} ${auth.token}`,
        },
        body: JSON.stringify({ personImage, outfitBoardImage }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || '무료 AI 가상 착장에 실패했습니다.')
      if (!data.imageUrl) throw new Error('AI 결과 이미지를 받지 못했습니다.')
      setAiImageUrl(data.imageUrl)
    } catch (generationError) {
      setError(generationError.message || '무료 AI 가상 착장에 실패했습니다.')
    } finally {
      setIsAiGenerating(false)
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
            <h2 id="cart-tryon-title">장바구니 전체 코디 가상 착장</h2>
          </div>
          <button ref={closeButtonRef} type="button" aria-label="전체 코디 가상 착장 닫기" onClick={onClose}>×</button>
        </header>

        <div className="virtual-tryon-body cart-tryon-body">
          <div
            className={`virtual-tryon-stage cart-tryon-stage${isDragOver ? ' is-drag-over' : ''}${aiImageUrl ? ' is-ai-result' : ''}`}
            aria-busy={isAiGenerating}
          >
            <img
              className="virtual-tryon-photo"
              src={aiImageUrl || photoUrl}
              alt={aiImageUrl ? 'AI가 생성한 전체 코디 착장' : (isUsingMannequin ? '가상 착장용 마네킹' : '선택한 착장 사진')}
              onError={aiImageUrl ? () => {
                setAiImageUrl('')
                setError('AI 결과 이미지를 불러오지 못했습니다. 다시 생성해 주세요.')
              } : undefined}
            />
            {!aiImageUrl ? products.map((product) => {
              const placement = placements[product.key]
              if (!placement?.visible) return null
              return (
                <img
                  key={product.key}
                  className={`virtual-tryon-product cart-tryon-layer${selectedId === product.key ? ' is-selected' : ''}`}
                  src={cutoutImages[product.key] || product.image}
                  alt=""
                  data-product-id={product.key}
                  data-slot={product.slot}
                  draggable="false"
                  onPointerDown={(event) => handleLayerPointerDown(event, product.key)}
                  onPointerMove={handleDragMove}
                  onPointerUp={handleDragEnd}
                  onPointerCancel={handleDragEnd}
                  style={{
                    zIndex: placement.layer,
                    left: `${placement.x}%`,
                    top: `${placement.y}%`,
                    width: `${placement.width}%`,
                    height: `${placement.height}%`,
                    transform: `translate(-50%, -50%) rotate(${placement.rotation}deg)`,
                  }}
                />
              )
            }) : null}
            {!aiImageUrl && isUsingMannequin ? (
              <>
                <img className="cart-tryon-occlusion is-head" src={DEFAULT_MANNEQUIN_URL} alt="" aria-hidden="true" draggable="false" />
                <img className="cart-tryon-occlusion is-left-hand" src={DEFAULT_MANNEQUIN_URL} alt="" aria-hidden="true" draggable="false" />
                <img className="cart-tryon-occlusion is-right-hand" src={DEFAULT_MANNEQUIN_URL} alt="" aria-hidden="true" draggable="false" />
              </>
            ) : null}
            {isAiGenerating ? <span className="cart-tryon-ai-loading">무료 AI가 네 상품을 한 벌로 입히는 중...</span> : null}
            <span className="virtual-tryon-drag-hint">{aiImageUrl ? 'AI 전체 착장 결과 · 상품을 다시 조절하면 수동 합성으로 돌아갑니다' : '상품을 놓으면 브라우저가 위치와 크기를 무료로 자동 맞춤해요'}</span>
          </div>

          <aside className="virtual-tryon-panel cart-tryon-panel">
            <div className="cart-tryon-summary">
              <small>장바구니 코디</small>
              <strong>{products.length}개 상품으로 코디 조합하기</strong>
              <p>상품을 드래그하면 원본 이미지의 배경을 정리하고 카테고리별 착용 위치에 자동 배치해요.</p>
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
                      aria-pressed={isSelected}
                      onClick={() => handleProductClick(product)}
                      onPointerDown={(event) => handleProductPointerDown(event, product)}
                      onPointerMove={handleProductPointerMove}
                      onPointerUp={(event) => finishProductDrag(event)}
                      onPointerCancel={(event) => finishProductDrag(event, true)}
                      title="마네킹으로 끌어놓아 자동 착장"
                    >
                      <img src={product.image} alt="" draggable="false" onDragStart={(event) => event.preventDefault()} />
                      <span><small>{product.category}</small><strong>{product.name}</strong></span>
                    </button>
                    <button
                      className="cart-tryon-visibility"
                      type="button"
                      aria-label={`${product.name} ${placement?.visible ? '숨기기' : '보이기'}`}
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
              <input type="file" accept="image/*" onChange={handlePhotoChange} />
              {isUsingMannequin ? '내 사진으로 바꾸기' : '사진 바꾸기'} <small>{photoName}</small>
            </label>
            {!isUsingMannequin ? <button className="virtual-tryon-mannequin" type="button" onClick={useDefaultMannequin}>기본 마네킹으로 돌아가기</button> : null}

            <div className="cart-tryon-ai-box">
              <span aria-hidden="true">AI</span>
              <p><strong>상의 · 하의 · 가방 · 모자 전체 착장</strong><small>현재 보이는 상품을 한 번에 몸에 맞춰 생성합니다.</small></p>
              <button type="button" disabled={isAiGenerating} onClick={generateAiOutfit}>
                {isAiGenerating ? '무료 AI 생성 중...' : (aiImageUrl ? '무료 AI 다시 생성' : '무료 AI 전체 착장 생성')}
              </button>
              <small>무료 공개 GPU라 대기하거나 일일 할당량이 끝날 수 있습니다. 연구·평가용 실험 기능입니다.</small>
            </div>

            {selectedProduct && selectedPlacement ? (
              <div className="cart-tryon-adjustments">
                <div className="cart-tryon-free-status">
                  <span aria-hidden="true">₩0</span>
                  <p><strong>브라우저 무료 자동 합성</strong><small>서버 전송 없이 이 기기에서 원본 이미지의 배경과 크기를 처리합니다.</small></p>
                </div>
                <p><strong>{selectedProduct.name}</strong> 조절</p>
                <label className="virtual-tryon-range">
                  <span><strong>착용 너비</strong><output>{selectedPlacement.width}%</output></span>
                  <input type="range" min="10" max="75" value={selectedPlacement.width} onChange={(event) => updatePlacement(selectedProduct.key, { width: Number(event.target.value) })} />
                </label>
                <label className="virtual-tryon-range">
                  <span><strong>착용 길이</strong><output>{selectedPlacement.height}%</output></span>
                  <input type="range" min="8" max="75" value={selectedPlacement.height} onChange={(event) => updatePlacement(selectedProduct.key, { height: Number(event.target.value) })} />
                </label>
                <label className="virtual-tryon-range">
                  <span><strong>기울기</strong><output>{selectedPlacement.rotation}°</output></span>
                  <input type="range" min="-30" max="30" value={selectedPlacement.rotation} onChange={(event) => updatePlacement(selectedProduct.key, { rotation: Number(event.target.value) })} />
                </label>
                <button className="cart-tryon-autofit" type="button" onClick={() => fitProduct(selectedProduct)}>무료 자동 맞춤</button>
              </div>
            ) : null}

            <button className="virtual-tryon-reset" type="button" onClick={resetOutfit}>전체 코디 위치 초기화</button>
            {error ? <p className="virtual-tryon-error" role="alert">{error}</p> : null}
            <div className="virtual-tryon-notice cart-tryon-notice">
              <strong>주문 전 마지막으로 확인해 보세요</strong>
              <p>수동 합성은 이 기기에서만 처리됩니다. AI 생성을 누른 경우에만 사진과 선택 상품 보드가 생성 처리를 위해 Hugging Face로 전송됩니다. 결과는 실제 주름·핏과 차이가 있습니다.</p>
            </div>
          </aside>
        </div>
        {dragPreview ? (
          <div className="cart-tryon-drag-preview" style={{ left: dragPreview.x, top: dragPreview.y }} aria-hidden="true">
            <img src={dragPreview.product.image} alt="" draggable="false" />
            <span>마네킹에 놓기</span>
          </div>
        ) : null}
      </section>
    </div>,
    document.body,
  )
}

export default CartVirtualTryOn
