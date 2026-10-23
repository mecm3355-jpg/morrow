const PRESET_PRODUCTS = {
  'top-front.png': { slot: 'top', code: 'top' },
  'cardigan-front.png': { slot: 'top', code: 'cardigan' },
  'bottom-front.png': { slot: 'bottom', code: 'bottom' },
  'cargo-front.png': { slot: 'bottom', code: 'cargo' },
  'accessory-front.png': { slot: 'accessory', code: 'bag' },
  'cap-front.png': { slot: 'headwear', code: 'cap' },
}

function getImageName(imageUrl = '') {
  return imageUrl.split('/').pop()?.split(/[?#]/)[0] || ''
}

function getPresetMannequinOutfit(products) {
  if (!Array.isArray(products) || !products.length) return ''

  const selected = new Map()
  for (const product of products) {
    const preset = PRESET_PRODUCTS[getImageName(product?.image)]
    if (!preset || preset.slot !== product?.slot || selected.has(preset.slot)) return ''
    selected.set(preset.slot, preset.code)
  }

  const top = selected.get('top')
  const bottom = selected.get('bottom')
  if (!top || !bottom) return ''

  const suffixes = []
  if (selected.has('accessory')) suffixes.push('bag')
  if (selected.has('headwear')) suffixes.push('cap')
  return `/products/around/outfit-${top}-${bottom}${suffixes.map((value) => `-${value}`).join('')}.png`
}

export { getPresetMannequinOutfit }
