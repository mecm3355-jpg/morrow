import { getSpriteFrameStyle, parseProductFrame } from '../utils/productMedia'

function ProductFrameImage({ source, alt = '', className = '', style, fetchPriority, draggable = false }) {
  const spriteFrame = parseProductFrame(source)
  const classes = `product-frame-image${className ? ` ${className}` : ''}`

  if (spriteFrame) {
    return (
      <span
        className={`${classes} is-sprite`}
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        style={{ ...getSpriteFrameStyle(spriteFrame), ...style }}
      />
    )
  }

  return <img className={classes} src={source} alt={alt} style={style} fetchPriority={fetchPriority} draggable={draggable} />
}

export default ProductFrameImage
