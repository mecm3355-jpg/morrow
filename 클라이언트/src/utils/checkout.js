function createBuyNowCart(product, selectedOption, quantity) {
  const price = Number(product?.price)
  const normalizedQuantity = Number(quantity)

  if (!product?._id || !Number.isInteger(price) || price < 0) {
    throw new Error('바로 구매할 상품 정보가 올바르지 않습니다.')
  }

  if (!Number.isInteger(normalizedQuantity) || normalizedQuantity < 1) {
    throw new Error('바로 구매할 상품 수량이 올바르지 않습니다.')
  }

  const currentLineTotal = price * normalizedQuantity
  const checkoutProduct = {
    _id: product._id,
    sku: product.sku,
    name: product.name,
    price,
    category: product.category,
    image: product.image,
  }

  return {
    items: [
      {
        _id: `buy-now-${product._id}`,
        product: checkoutProduct,
        selectedOption,
        quantity: normalizedQuantity,
        price,
        currentPrice: price,
        priceChanged: false,
        lineTotal: currentLineTotal,
        currentLineTotal,
      },
    ],
    summary: {
      totalQuantity: normalizedQuantity,
      totalPrice: currentLineTotal,
      currentTotalPrice: currentLineTotal,
      hasPriceChanges: false,
    },
  }
}

export { createBuyNowCart }
