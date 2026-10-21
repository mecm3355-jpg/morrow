const SPRITE_FRAME_PATTERN = /#frame=(\d+)&cols=(\d+)&rows=(\d+)$/

// Generated turntable frames have slightly different optical centers. Keeping
// these centers aligned makes rotation change only the photographed angle.
const SPRITE_OPTICAL_CENTERS = {
  'top-turntable.png': [[0.62, 0.51], [0.63, 0.51], [0.49, 0.52], [0.39, 0.51], [0.61, 0.48], [0.59, 0.48], [0.51, 0.49], [0.38, 0.48]],
  'cardigan-turntable.png': [[0.53, 0.50], [0.58, 0.51], [0.52, 0.52], [0.47, 0.51], [0.52, 0.46], [0.57, 0.46], [0.51, 0.47], [0.46, 0.47]],
  'bottom-turntable.png': [[0.64, 0.51], [0.59, 0.51], [0.50, 0.51], [0.42, 0.51], [0.64, 0.49], [0.57, 0.49], [0.49, 0.49], [0.42, 0.49]],
  'cargo-turntable.png': [[0.68, 0.50], [0.57, 0.49], [0.51, 0.49], [0.39, 0.49], [0.67, 0.48], [0.57, 0.48], [0.50, 0.47], [0.43, 0.48]],
  'accessory-turntable.png': [[0.55, 0.50], [0.56, 0.50], [0.50, 0.50], [0.46, 0.50], [0.54, 0.49], [0.52, 0.50], [0.50, 0.49], [0.46, 0.50]],
  'cap-turntable.png': [[0.50, 0.56], [0.49, 0.56], [0.51, 0.55], [0.50, 0.55], [0.50, 0.52], [0.49, 0.51], [0.49, 0.52], [0.49, 0.53]],
}

function getOpticalCenter(source, frame) {
  const fileName = source.split('/').pop()
  return SPRITE_OPTICAL_CENTERS[fileName]?.[frame] || [0.5, 0.5]
}

function formatPercentage(value) {
  return `${Math.round(value * 1000) / 1000}%`
}

export function parseProductFrame(source) {
  if (typeof source !== 'string') return null
  const match = source.match(SPRITE_FRAME_PATTERN)
  if (!match) return null

  const frame = Number(match[1])
  const columns = Number(match[2])
  const rows = Number(match[3])
  if (!Number.isInteger(frame) || columns < 1 || rows < 1 || frame >= columns * rows) return null

  const spriteSource = source.slice(0, match.index)
  const usesPortraitCells = /\/(bottom|cardigan|cargo)-turntable\.png$/.test(spriteSource)
  return {
    source: spriteSource,
    frame,
    columns,
    rows,
    aspectRatio: usesPortraitCells ? '3 / 4' : '1 / 1',
  }
}

export function getSpriteFrameStyle(frameData) {
  const column = frameData.frame % frameData.columns
  const row = Math.floor(frameData.frame / frameData.columns)
  const [centerX, centerY] = getOpticalCenter(frameData.source, frameData.frame)
  const x = frameData.columns === 1 ? 0 : ((column + centerX - 0.5) / (frameData.columns - 1)) * 100
  const y = frameData.rows === 1 ? 0 : ((row + centerY - 0.5) / (frameData.rows - 1)) * 100

  return {
    backgroundImage: `url("${frameData.source}")`,
    backgroundPosition: `${formatPercentage(x)} ${formatPercentage(y)}`,
    backgroundSize: `${frameData.columns * 100}% ${frameData.rows * 100}%`,
    aspectRatio: frameData.aspectRatio,
  }
}

export function wrapProductFrame(index, frameCount) {
  if (!Number.isInteger(frameCount) || frameCount < 1) return 0
  return ((index % frameCount) + frameCount) % frameCount
}

export function getDraggedFrame(startFrame, startX, currentX, frameCount, pixelsPerFrame = 12) {
  const frameDelta = Math.round((startX - currentX) / pixelsPerFrame)
  return wrapProductFrame(startFrame + frameDelta, frameCount)
}
