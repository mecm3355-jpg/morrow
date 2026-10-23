const AI_REFERENCE_WIDTH = 768
const AI_REFERENCE_HEIGHT = 1024
const OUTFIT_BOARD_SLOTS = [
  { slot: 'top', label: 'TOP' },
  { slot: 'bottom', label: 'BOTTOM' },
  { slot: 'accessory', label: 'BAG' },
  { slot: 'headwear', label: 'CAP' },
]

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

export {
  createAiPersonReference,
  createOutfitBoard,
}
