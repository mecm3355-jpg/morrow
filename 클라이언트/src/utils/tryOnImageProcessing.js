const MAX_PROCESSING_EDGE = 900
const OPAQUE_ALPHA_THRESHOLD = 12
const AI_REFERENCE_WIDTH = 768
const AI_REFERENCE_HEIGHT = 1024
const OUTFIT_BOARD_SLOTS = [
  { slot: 'top', label: 'TOP' },
  { slot: 'bottom', label: 'BOTTOM' },
  { slot: 'accessory', label: 'BAG' },
  { slot: 'headwear', label: 'CAP' },
]

function getCornerBackground(pixels, width, height) {
  const corners = [
    0,
    (width - 1) * 4,
    (height - 1) * width * 4,
    ((height * width) - 1) * 4,
  ]

  return corners.reduce((color, offset) => ({
    r: color.r + pixels[offset] / corners.length,
    g: color.g + pixels[offset + 1] / corners.length,
    b: color.b + pixels[offset + 2] / corners.length,
  }), { r: 0, g: 0, b: 0 })
}

function removeLightNeutralBackground(pixels, width, height) {
  const background = getCornerBackground(pixels, width, height)
  const minimumBackground = Math.min(background.r, background.g, background.b)
  const maximumBackground = Math.max(background.r, background.g, background.b)
  const isLightNeutral = minimumBackground > 225 && maximumBackground - minimumBackground < 24
  if (!isLightNeutral) return false

  const pixelCount = width * height
  const visited = new Uint8Array(pixelCount)
  const queue = new Int32Array(pixelCount)
  let head = 0
  let tail = 0

  function isBackgroundPixel(pixelIndex) {
    const offset = pixelIndex * 4
    const minimum = Math.min(pixels[offset], pixels[offset + 1], pixels[offset + 2])
    const maximum = Math.max(pixels[offset], pixels[offset + 1], pixels[offset + 2])
    return maximum - minimum < 30 && minimum > 220
  }

  function enqueue(pixelIndex) {
    if (visited[pixelIndex] || !isBackgroundPixel(pixelIndex)) return
    visited[pixelIndex] = 1
    queue[tail] = pixelIndex
    tail += 1
  }

  for (let x = 0; x < width; x += 1) {
    enqueue(x)
    enqueue(((height - 1) * width) + x)
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(y * width)
    enqueue((y * width) + width - 1)
  }

  while (head < tail) {
    const pixelIndex = queue[head]
    head += 1
    const offset = pixelIndex * 4
    const minimum = Math.min(pixels[offset], pixels[offset + 1], pixels[offset + 2])
    if (minimum >= 245) pixels[offset + 3] = 0
    else if (minimum > 220) {
      pixels[offset + 3] = Math.round(pixels[offset + 3] * ((245 - minimum) / 25))
    }

    const x = pixelIndex % width
    const y = Math.floor(pixelIndex / width)
    if (x > 0) enqueue(pixelIndex - 1)
    if (x < width - 1) enqueue(pixelIndex + 1)
    if (y > 0) enqueue(pixelIndex - width)
    if (y < height - 1) enqueue(pixelIndex + width)
  }

  return true
}

function findOpaqueBounds(pixels, width, height, alphaThreshold = OPAQUE_ALPHA_THRESHOLD) {
  let left = width
  let top = height
  let right = -1
  let bottom = -1

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[((y * width) + x) * 4 + 3] <= alphaThreshold) continue
      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x)
      bottom = Math.max(bottom, y)
    }
  }

  if (right < left || bottom < top) return null
  return {
    x: left,
    y: top,
    width: right - left + 1,
    height: bottom - top + 1,
  }
}

function loadImage(imageUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = imageUrl
  })
}

function drawContainedImage(context, image, area, padding = 24) {
  const availableWidth = Math.max(1, area.width - (padding * 2))
  const availableHeight = Math.max(1, area.height - (padding * 2))
  const scale = Math.min(
    availableWidth / image.naturalWidth,
    availableHeight / image.naturalHeight,
  )
  const width = image.naturalWidth * scale
  const height = image.naturalHeight * scale
  const x = area.x + ((area.width - width) / 2)
  const y = area.y + ((area.height - height) / 2)
  context.drawImage(image, x, y, width, height)
}

async function createAiPersonReference(imageUrl) {
  const image = await loadImage(imageUrl)
  const canvas = document.createElement('canvas')
  canvas.width = AI_REFERENCE_WIDTH
  canvas.height = AI_REFERENCE_HEIGHT
  const context = canvas.getContext('2d')
  if (!context) throw new Error('AI 입력 이미지를 준비하지 못했습니다.')

  context.fillStyle = '#f3f4f6'
  context.fillRect(0, 0, canvas.width, canvas.height)
  drawContainedImage(context, image, {
    x: 0,
    y: 0,
    width: canvas.width,
    height: canvas.height,
  }, 0)
  return canvas.toDataURL('image/jpeg', 0.9)
}

async function createOutfitBoard(products) {
  const productsBySlot = new Map(products.map((product) => [product.slot, product]))
  const canvas = document.createElement('canvas')
  canvas.width = AI_REFERENCE_WIDTH
  canvas.height = AI_REFERENCE_HEIGHT
  const context = canvas.getContext('2d')
  if (!context) throw new Error('AI 코디 보드를 준비하지 못했습니다.')

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  const cellWidth = canvas.width / 2
  const cellHeight = canvas.height / 2

  await Promise.all(OUTFIT_BOARD_SLOTS.map(async ({ slot, label }, index) => {
    const column = index % 2
    const row = Math.floor(index / 2)
    const x = column * cellWidth
    const y = row * cellHeight
    const product = productsBySlot.get(slot)

    context.strokeStyle = '#e5e7eb'
    context.lineWidth = 2
    context.strokeRect(x + 8, y + 8, cellWidth - 16, cellHeight - 16)
    context.fillStyle = product ? '#111827' : '#9ca3af'
    context.font = '700 28px Arial, sans-serif'
    context.fillText(product ? label : `${label} EMPTY`, x + 24, y + cellHeight - 28)

    if (!product) return
    const image = await loadImage(product.image)
    drawContainedImage(context, image, {
      x,
      y: y + 10,
      width: cellWidth,
      height: cellHeight - 72,
    })
  }))

  return canvas.toDataURL('image/jpeg', 0.9)
}

async function createBrowserCutout(imageUrl) {
  const image = await loadImage(imageUrl)
  const scale = Math.min(
    1,
    MAX_PROCESSING_EDGE / Math.max(image.naturalWidth, image.naturalHeight),
  )
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return ''

  context.drawImage(image, 0, 0, width, height)
  const imageData = context.getImageData(0, 0, width, height)
  if (removeLightNeutralBackground(imageData.data, width, height)) {
    context.putImageData(imageData, 0, 0)
  }

  const bounds = findOpaqueBounds(imageData.data, width, height)
  const outputCanvas = document.createElement('canvas')
  if (bounds) {
    const padding = Math.max(2, Math.round(Math.max(bounds.width, bounds.height) * 0.02))
    const sourceX = Math.max(0, bounds.x - padding)
    const sourceY = Math.max(0, bounds.y - padding)
    const sourceRight = Math.min(width, bounds.x + bounds.width + padding)
    const sourceBottom = Math.min(height, bounds.y + bounds.height + padding)
    outputCanvas.width = sourceRight - sourceX
    outputCanvas.height = sourceBottom - sourceY
    outputCanvas.getContext('2d')?.drawImage(
      canvas,
      sourceX,
      sourceY,
      outputCanvas.width,
      outputCanvas.height,
      0,
      0,
      outputCanvas.width,
      outputCanvas.height,
    )
  } else {
    outputCanvas.width = width
    outputCanvas.height = height
    outputCanvas.getContext('2d')?.drawImage(canvas, 0, 0)
  }

  const blob = await new Promise((resolve) => outputCanvas.toBlob(resolve, 'image/png'))
  return blob ? URL.createObjectURL(blob) : ''
}

export {
  createAiPersonReference,
  createBrowserCutout,
  createOutfitBoard,
  findOpaqueBounds,
  removeLightNeutralBackground,
}
