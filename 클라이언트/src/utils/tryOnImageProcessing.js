const MAX_PROCESSING_EDGE = 900

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

function loadImage(imageUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = imageUrl
  })
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

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  return blob ? URL.createObjectURL(blob) : ''
}

export { createBrowserCutout, removeLightNeutralBackground }
