import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './VirtualTryOn.css'
import './CartVirtualTryOn.css'

const DEFAULT_MANNEQUIN_URL = '/products/around/mannequin-front.png'
const MAX_PHOTO_SIZE = 10 * 1024 * 1024
const TRY_ON_IMAGES = {
  'top-front.png': '/products/around/top-tryon.png',
  'cardigan-front.png': '/products/around/cardigan-tryon.png',
  'bottom-front.png': '/products/around/bottom-tryon.png',
  'cargo-front.png': '/products/around/cargo-tryon.png',
  'accessory-front.png': '/products/around/accessory-tryon.png',
  'cap-front.png': '/products/around/cap-tryon.png',
}
const OUTFIT_COMPOSITES = {
  'top-front.png|bottom-front.png': '/products/around/outfit-top-bottom.png',
  'top-front.png|cargo-front.png': '/products/around/outfit-top-cargo.png',
  'cardigan-front.png|bottom-front.png': '/products/around/outfit-cardigan-bottom.png',
  'cardigan-front.png|cargo-front.png': '/products/around/outfit-cardigan-cargo.png',
}
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

function getTryOnImage(product) {
  const imageName = getImageName(product.image)
  return TRY_ON_IMAGES[imageName] || product.image
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
        uniqueProducts.set(key, { ...product, key, slot: getProductSlot(product), tryOnImage: getTryOnImage(product) })
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
  const objectUrlRef = useRef('')
  const dragRef = useRef(null)
  const productDragRef = useRef(null)
  const suppressClickRef = useRef(false)
  const closeButtonRef = useRef(null)

  const selectedProduct = products.find((product) => product.key === selectedId) || products[0]
  const selectedPlacement = selectedProduct ? placements[selectedProduct.key] : null
  const visibleTop = products.find((product) => product.slot === 'top' && placements[product.key]?.visible)
  const visibleBottom = products.find((product) => product.slot === 'bottom' && placements[product.key]?.visible)
  const visibleAccessory = products.find((product) => product.slot === 'accessory' && placements[product.key]?.visible)
  const visibleHeadwear = products.find((product) => product.slot === 'headwear' && placements[product.key]?.visible)
  const integratedBag = getImageName(visibleAccessory?.image) === 'accessory-front.png' ? visibleAccessory : null
  const integratedCap = getImageName(visibleHeadwear?.image) === 'cap-front.png' ? visibleHeadwear : null
  const baseOutfitComposite = isUsingMannequin && visibleTop && visibleBottom
    ? OUTFIT_COMPOSITES[`${getImageName(visibleTop.image)}|${getImageName(visibleBottom.image)}`] || ''
    : ''
  const accessorySuffix = `${integratedBag ? '-bag' : ''}${integratedCap ? '-cap' : ''}`
  const outfitComposite = baseOutfitComposite
    ? baseOutfitComposite.replace('.png', `${accessorySuffix}.png`)
    : ''
  const compositedProductIds = new Set(
    [visibleTop, visibleBottom, integratedBag, integratedCap].filter(Boolean).map((product) => product.key),
  )
  const stagePhotoUrl = outfitComposite || photoUrl
  const selectedUsesComposite = Boolean(
    outfitComposite && selectedProduct && compositedProductIds.has(selectedProduct.key),
  )

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
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

  function updatePlacement(productId, values) {
    setPlacements((current) => ({
      ...current,
      [productId]: { ...current[productId], ...values },
    }))
  }

  function showProduct(product) {
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

  function finishProductDrag(event, cancelled = false) {
    const drag = productDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (drag.active) {
      if (!cancelled && isPointOverStage(event.clientX, event.clientY)) fitProduct(drag.product)
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
    setError('')
  }

  function resetOutfit() {
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
              alt={outfitComposite ? '마네킹 체형에 맞춰 합성된 전체 착장' : (isUsingMannequin ? '가상 착장용 마네킹' : '선택한 착장 사진')}
            />
            {products.map((product) => {
              const placement = placements[product.key]
              if (!placement?.visible || (outfitComposite && compositedProductIds.has(product.key))) return null
              return (
                <img
                  key={product.key}
                  className={`virtual-tryon-product cart-tryon-layer${selectedId === product.key ? ' is-selected' : ''}`}
                  src={isUsingMannequin ? product.tryOnImage : product.image}
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
            <span className="virtual-tryon-drag-hint">상의와 하의를 고르면 마네킹 체형에 맞춘 입체 착장으로 바뀌어요</span>
          </div>

          <aside className="virtual-tryon-panel cart-tryon-panel">
            <div className="cart-tryon-summary">
              <small>장바구니 코디</small>
              <strong>{products.length}개 상품으로 코디 조합하기</strong>
              <p>상의·하의는 체형에 맞춘 전체 착장으로 합성하고, 모자·가방은 실제 착용 위치에 배치해요.</p>
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
                    <p><strong>{selectedProduct.name}</strong>이 마네킹 체형에 맞춰 적용됐어요.<small>크기·원근·가림과 접촉 그림자를 포함한 전체 착장으로 고정해 어긋나지 않습니다.</small></p>
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
                    <button className="cart-tryon-autofit" type="button" onClick={() => fitProduct(selectedProduct)}>마네킹에 자동 맞춤</button>
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
