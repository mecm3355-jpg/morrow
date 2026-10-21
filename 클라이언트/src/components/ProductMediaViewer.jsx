import { useEffect, useMemo, useRef, useState } from 'react'
import ProductFrameImage from './ProductFrameImage'
import { getDraggedFrame, wrapProductFrame } from '../utils/productMedia'
import './ProductMediaViewer.css'

function normalizeFrames(product) {
  const spinImages = Array.isArray(product.spinImages)
    ? product.spinImages.filter((image) => typeof image === 'string' && image.trim())
    : []
  const uniqueSpinImages = [...new Set(spinImages)]

  return uniqueSpinImages.length >= 2
    ? { frames: uniqueSpinImages, mode: 'spin' }
    : { frames: [product.image].filter(Boolean), mode: 'depth' }
}

function getThumbnailIndexes(frameCount) {
  if (frameCount <= 5) return Array.from({ length: frameCount }, (_, index) => index)
  return [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round((frameCount - 1) * ratio))
}

function ProductMediaViewer({ product }) {
  const { frames, mode } = useMemo(() => normalizeFrames(product), [product])
  const thumbnailIndexes = useMemo(() => getThumbnailIndexes(frames.length), [frames.length])
  const [frameIndex, setFrameIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const dragRef = useRef(null)
  const isSpin = mode === 'spin'

  useEffect(() => {
    if (!isSpin || !isAutoPlaying) return undefined
    const timer = window.setInterval(() => {
      setFrameIndex((current) => wrapProductFrame(current + 1, frames.length))
    }, 110)
    return () => window.clearInterval(timer)
  }, [frames.length, isAutoPlaying, isSpin])

  function handlePointerDown(event) {
    if (!isSpin) return
    setIsAutoPlaying(false)
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startFrame: frameIndex }
  }

  function handlePointerMove(event) {
    if (isSpin && dragRef.current?.pointerId === event.pointerId) {
      setFrameIndex(getDraggedFrame(dragRef.current.startFrame, dragRef.current.startX, event.clientX, frames.length))
      return
    }

    if (!isSpin) {
      const bounds = event.currentTarget.getBoundingClientRect()
      const horizontal = (event.clientX - bounds.left) / bounds.width - 0.5
      const vertical = (event.clientY - bounds.top) / bounds.height - 0.5
      setTilt({ x: vertical * -9, y: horizontal * 11 })
    }
  }

  function handlePointerEnd(event) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null
  }

  function handleKeyDown(event) {
    if (!isSpin || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return
    event.preventDefault()
    setIsAutoPlaying(false)
    setFrameIndex((current) => wrapProductFrame(current + (event.key === 'ArrowRight' ? 1 : -1), frames.length))
  }

  return (
    <div className={`product-media-viewer is-${mode}`}>
      <div className="product-detail-thumbs" aria-label="상품 이미지 목록">
        {thumbnailIndexes.map((index) => (
          <button
            className={frameIndex === index ? 'is-active' : ''}
            type="button"
            aria-label={`${isSpin ? '360도 프레임' : '상품 이미지'} ${index + 1}`}
            aria-pressed={frameIndex === index}
            onClick={() => {
              setIsAutoPlaying(false)
              setFrameIndex(index)
            }}
            key={`${frames[index]}-${index}`}
          >
            <ProductFrameImage source={frames[index]} />
          </button>
        ))}
      </div>

      <div
        className="product-detail-main-image"
        role={isSpin ? 'slider' : 'img'}
        aria-label={isSpin ? `${product.name} 360도 보기. 좌우로 드래그하거나 방향키를 사용하세요.` : `${product.name} 입체 보기`}
        aria-valuemin={isSpin ? 1 : undefined}
        aria-valuemax={isSpin ? frames.length : undefined}
        aria-valuenow={isSpin ? frameIndex + 1 : undefined}
        tabIndex={isSpin ? 0 : undefined}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onPointerLeave={(event) => {
          handlePointerEnd(event)
          if (!isSpin) setTilt({ x: 0, y: 0 })
        }}
      >
        <ProductFrameImage
          source={frames[frameIndex]}
          alt={product.name}
          fetchPriority="high"
          draggable="false"
          style={!isSpin ? { transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.035)` } : undefined}
        />
        <div className="product-view-mode"><span aria-hidden="true">{isSpin ? '360°' : '◈'}</span>{isSpin ? '360° 보기' : '입체 보기'}</div>
        <span className="product-view-count">{String(frameIndex + 1).padStart(2, '0')} / {String(frames.length).padStart(2, '0')}</span>
        <p className="product-view-hint">{isSpin ? '좌우로 드래그해 모든 각도를 확인하세요' : '이미지 위에서 포인터를 움직여 입체감을 확인하세요'}</p>
      </div>

      {isSpin ? (
        <div className="product-view-controls">
          <button type="button" onClick={() => setFrameIndex((current) => wrapProductFrame(current - 1, frames.length))} aria-label="이전 각도">←</button>
          <button className="product-view-play" type="button" aria-pressed={isAutoPlaying} onClick={() => setIsAutoPlaying((current) => !current)}>
            {isAutoPlaying ? '일시정지' : '자동 회전'}
          </button>
          <button type="button" onClick={() => setFrameIndex((current) => wrapProductFrame(current + 1, frames.length))} aria-label="다음 각도">→</button>
        </div>
      ) : null}
    </div>
  )
}

export default ProductMediaViewer
