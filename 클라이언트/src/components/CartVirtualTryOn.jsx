import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getStoredAuth } from '../utils/authStorage'
import './VirtualTryOn.css'
import './CartVirtualTryOn.css'

const API_URL = import.meta.env.VITE_API_URL || ''
const DEFAULT_MANNEQUIN_URL = '/products/around/mannequin-front.png'
const MAX_PHOTO_SIZE = 10 * 1024 * 1024
const TRY_ON_PLACEMENTS = {
  'top-front.png': { x: 50, y: 36.5, scale: 48, rotation: 0, layer: 3 },
  'cardigan-front.png': { x: 50, y: 35.5, scale: 46, rotation: 0, layer: 3 },
  'bottom-front.png': { x: 50, y: 72.5, scale: 52, rotation: 0, layer: 2 },
  'cargo-front.png': { x: 50, y: 72, scale: 56, rotation: 0, layer: 2 },
  'accessory-front.png': { x: 56, y: 32, scale: 30, rotation: -3, layer: 4 },
  'cap-front.png': { x: 50, y: 8, scale: 17, rotation: 0, layer: 5 },
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

  if (category === '하의') return { x: 50, y: 72, scale: 52, rotation: 0, layer: 2 }
  if (category === '악세사리' && /(캡|모자|hat|cap)/i.test(name)) {
    return { x: 50, y: 8, scale: 17, rotation: 0, layer: 5 }
  }
  if (category === '악세사리') return { x: 56, y: 32, scale: 30, rotation: -3, layer: 4 }
  return { x: 50, y: 36, scale: 47, rotation: 0, layer: 3 }
}

function createPlacements(products) {
  const occupiedSlots = new Set()
  return products.reduce((result, product) => {
    const visible = !occupiedSlots.has(product.slot)
    if (visible) occupiedSlots.add(product.slot)
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
  const [aiComposite, setAiComposite] = useState(null)
  const [isGeneratingAi, setIsGeneratingAi] = useState(false)
  const objectUrlRef = useRef('')
  const dragRef = useRef(null)
  const productDragRef = useRef(null)
  const suppressClickRef = useRef(false)
  const closeButtonRef = useRef(null)
  const aiRequestControllerRef = useRef(null)
  const aiCompositeCacheRef = useRef(new Map())

  const selectedProduct = products.find((product) => product.key === selectedId) || products[0]
  const selectedPlacement = selectedProduct ? placements[selectedProduct.key] : null
  const compositedProductIds = new Set(aiComposite?.productIds || [])
  const stagePhotoUrl = aiComposite?.imageDataUrl || photoUrl
  const selectedUsesComposite = Boolean(
    aiComposite && selectedProduct && compositedProductIds.has(selectedProduct.key),
  )

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    aiRequestControllerRef.current?.abort()
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

  function clearAiComposite() {
    aiRequestControllerRef.current?.abort()
    aiRequestControllerRef.current = null
    setAiComposite(null)
    setIsGeneratingAi(false)
  }

  function updatePlacement(productId, values) {
    clearAiComposite()
    setPlacements((current) => ({
      ...current,
      [productId]: { ...current[productId], ...values },
    }))
  }

  function showProduct(product) {
    clearAiComposite()
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
    const fittedPlacement = getInitialPlacement(product)
    clearAiComposite()
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
    clearAiComposite()
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

  function getOutfitProductsForDrop(droppedProduct) {
    return products.filter((product) => (
      product.key === droppedProduct.key
      || (product.slot !== droppedProduct.slot && placements[product.key]?.visible)
    ))
  }

  async function generateAiTryOn(outfitProducts) {
    const auth = getStoredAuth()
    if (!auth?.token) {
      setError('AI 가상착장을 사용하려면 다시 로그인해 주세요.')
      return
    }

    const productIds = outfitProducts.map((product) => product.key)
    const cacheKey = [...productIds].sort().join('|')
    const cachedImage = aiCompositeCacheRef.current.get(cacheKey)
    if (cachedImage) {
      setAiComposite({ imageDataUrl: cachedImage, productIds })
      setError('')
      return
    }

    aiRequestControllerRef.current?.abort()
    const controller = new AbortController()
    aiRequestControllerRef.current = controller
    setAiComposite(null)
    setIsGeneratingAi(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/api/products/try-on/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `${auth.tokenType || 'Bearer'} ${auth.token}`,
        },
        body: JSON.stringify({ productIds }),
        signal: controller.signal,
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || 'AI 가상착장 이미지를 생성하지 못했습니다.')
      if (!data.imageDataUrl) throw new Error('AI가 생성한 이미지를 받지 못했습니다.')

      aiCompositeCacheRef.current.set(cacheKey, data.imageDataUrl)
      setAiComposite({ imageDataUrl: data.imageDataUrl, productIds: data.productIds || productIds })
    } catch (requestError) {
      if (requestError.name !== 'AbortError') {
        setError(requestError.message || 'AI 가상착장 이미지를 생성하지 못했습니다.')
      }
    } finally {
      if (aiRequestControllerRef.current === controller) {
        aiRequestControllerRef.current = null
        setIsGeneratingAi(false)
      }
    }
  }

  function applyProductWithAi(product) {
    fitProduct(product)
    if (isUsingMannequin) {
      void generateAiTryOn(getOutfitProductsForDrop(product))
    } else {
      setError('AI 생성은 기본 마네킹에서만 지원합니다. 내 사진에서는 수동으로 위치를 조절해 주세요.')
    }
  }

  function finishProductDrag(event, cancelled = false) {
    const drag = productDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (drag.active) {
      if (!cancelled && isPointOverStage(event.clientX, event.clientY)) {
        applyProductWithAi(drag.product)
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
    clearAiComposite()
    setPhotoUrl(objectUrlRef.current)
    setPhotoName(file.name)
    setIsUsingMannequin(false)
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
    clearAiComposite()
    setError('')
  }

  function resetOutfit() {
    clearAiComposite()
    setPlacements(createPlacements(products))
    setSelectedId(products[0]?.key || '')
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
            className={`virtual-tryon-stage cart-tryon-stage${isDragOver ? ' is-drag-over' : ''}`}
          >
            <img
              className="virtual-tryon-photo"
              src={stagePhotoUrl}
              alt={aiComposite ? 'AI가 마네킹 체형에 맞춰 생성한 전체 착장' : (isUsingMannequin ? '가상 착장용 마네킹' : '선택한 착장 사진')}
            />
            {products.map((product) => {
              const placement = placements[product.key]
              if (!placement?.visible || (aiComposite && compositedProductIds.has(product.key))) return null
              return (
                <img
                  key={product.key}
                  className={`virtual-tryon-product cart-tryon-layer${selectedId === product.key ? ' is-selected' : ''}`}
                  src={product.image}
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
                    width: `${placement.scale}%`,
                    transform: `translate(-50%, -50%) rotate(${placement.rotation}deg)`,
                  }}
                />
              )
            })}
            {isGeneratingAi ? (
              <div className="cart-tryon-ai-loading" role="status">
                <span aria-hidden="true" />
                <strong>AI가 마네킹 체형에 맞춰 착장을 생성하고 있어요</strong>
                <small>상품 수에 따라 잠시 시간이 걸릴 수 있습니다.</small>
              </div>
            ) : null}
            <span className="virtual-tryon-drag-hint">상품을 마네킹에 놓으면 AI가 새로운 착장 이미지를 생성해요</span>
          </div>

          <aside className="virtual-tryon-panel cart-tryon-panel">
            <div className="cart-tryon-summary">
              <small>장바구니 코디</small>
              <strong>{products.length}개 상품으로 코디 조합하기</strong>
              <p>상품을 마네킹에 드래그하면 현재 코디를 분석해 새로운 AI 착장 이미지를 생성해요.</p>
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
                      <img src={product.image} alt="" />
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

            {selectedProduct && selectedPlacement ? (
              <div className="cart-tryon-adjustments">
                {selectedUsesComposite ? (
                  <div className="cart-tryon-composite-status">
                    <span aria-hidden="true">✓</span>
                    <p><strong>{selectedProduct.name}</strong>을 포함한 새 착장을 AI가 생성했어요.<small>상품 이미지와 현재 코디를 함께 분석한 미리보기이며 실제 디자인·핏과 차이가 있을 수 있습니다.</small></p>
                  </div>
                ) : (
                  <>
                    <p><strong>{selectedProduct.name}</strong> 조절</p>
                    <label className="virtual-tryon-range">
                      <span><strong>상품 크기</strong><output>{selectedPlacement.scale}%</output></span>
                      <input type="range" min="18" max="110" value={selectedPlacement.scale} onChange={(event) => updatePlacement(selectedProduct.key, { scale: Number(event.target.value) })} />
                    </label>
                    <label className="virtual-tryon-range">
                      <span><strong>기울기</strong><output>{selectedPlacement.rotation}°</output></span>
                      <input type="range" min="-30" max="30" value={selectedPlacement.rotation} onChange={(event) => updatePlacement(selectedProduct.key, { rotation: Number(event.target.value) })} />
                    </label>
                    <button className="cart-tryon-autofit" type="button" disabled={isGeneratingAi} onClick={() => applyProductWithAi(selectedProduct)}>
                      {isGeneratingAi ? 'AI 착장 생성 중...' : 'AI 가상착장 생성'}
                    </button>
                  </>
                )}
              </div>
            ) : null}

            <button className="virtual-tryon-reset" type="button" onClick={resetOutfit}>전체 코디 위치 초기화</button>
            {error ? <p className="virtual-tryon-error" role="alert">{error}</p> : null}
            <div className="virtual-tryon-notice cart-tryon-notice">
              <strong>주문 전 마지막으로 확인해 보세요</strong>
              <p>간편 미리보기이므로 실제 핏·색감과 차이가 있을 수 있습니다. 사진은 서버로 전송되지 않습니다.</p>
            </div>
          </aside>
        </div>
        {dragPreview ? (
          <div className="cart-tryon-drag-preview" style={{ left: dragPreview.x, top: dragPreview.y }} aria-hidden="true">
            <img src={dragPreview.product.image} alt="" />
            <span>마네킹에 놓기</span>
          </div>
        ) : null}
      </section>
    </div>,
    document.body,
  )
}

export default CartVirtualTryOn
