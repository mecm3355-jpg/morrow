const mongoose = require('mongoose');

const Cart = require('../models/cart.model');
const Product = require('../models/product.model');

const { MAX_CART_ITEM_QUANTITY } = Cart;
const PRODUCT_FIELDS = 'sku name price category image';

function isValidObjectId(value) {
  return mongoose.isObjectIdOrHexString(value);
}

function normalizeOption(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseQuantity(value, defaultValue = 1) {
  const quantity = value === undefined ? defaultValue : Number(value);
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= MAX_CART_ITEM_QUANTITY
    ? quantity
    : null;
}

function idsEqual(first, second) {
  return first?.toString() === second?.toString();
}

function toPlainObject(document) {
  return typeof document?.toObject === 'function' ? document.toObject() : document;
}

function serializeCart(cart) {
  if (!cart) {
    return {
      items: [],
      summary: {
        totalQuantity: 0,
        totalPrice: 0,
        currentTotalPrice: 0,
        hasPriceChanges: false,
      },
    };
  }

  const source = toPlainObject(cart);
  const items = (source.items || []).map((item) => {
    const populatedProduct = item.product && typeof item.product === 'object' && item.product.price !== undefined
      ? item.product
      : null;
    const storedPrice = item.price;
    const currentPrice = populatedProduct?.price ?? storedPrice;

    return {
      _id: item._id,
      product: populatedProduct || item.product,
      selectedOption: item.selectedOption || '',
      quantity: item.quantity,
      price: storedPrice,
      currentPrice,
      priceChanged: currentPrice !== storedPrice,
      lineTotal: storedPrice * item.quantity,
      currentLineTotal: currentPrice * item.quantity,
      addedAt: item.addedAt,
    };
  });

  return {
    _id: source._id,
    user: source.user,
    items,
    summary: {
      totalQuantity: items.reduce((total, item) => total + item.quantity, 0),
      totalPrice: items.reduce((total, item) => total + item.lineTotal, 0),
      currentTotalPrice: items.reduce((total, item) => total + item.currentLineTotal, 0),
      hasPriceChanges: items.some((item) => item.priceChanged),
    },
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

async function populateCart(cart) {
  if (!cart) return null;
  await cart.populate('items.product', PRODUCT_FIELDS);
  return cart;
}

async function getCart(req, res) {
  const cart = await Cart.findOne({ user: req.auth.userId });
  await populateCart(cart);
  return res.status(200).json(serializeCart(cart));
}

async function addCartItem(req, res) {
  const productId = req.body?.productId;
  const selectedOption = normalizeOption(req.body?.selectedOption);
  const quantity = parseQuantity(req.body?.quantity);

  if (!isValidObjectId(productId)) {
    return res.status(400).json({ message: '유효하지 않은 상품 ID입니다.' });
  }

  if (quantity === null) {
    return res.status(400).json({ message: `상품 수량은 1개 이상 ${MAX_CART_ITEM_QUANTITY}개 이하의 정수여야 합니다.` });
  }

  if (selectedOption.length > 50) {
    return res.status(400).json({ message: '상품 옵션은 50자 이하여야 합니다.' });
  }

  const product = await Product.findById(productId).select(PRODUCT_FIELDS);

  if (!product) {
    return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
  }

  let cart = await Cart.findOne({ user: req.auth.userId });
  if (!cart) cart = new Cart({ user: req.auth.userId, items: [] });

  const existingItem = cart.items.find(
    (item) => idsEqual(item.product, product._id) && item.selectedOption === selectedOption,
  );

  if (existingItem) {
    const nextQuantity = existingItem.quantity + quantity;
    if (nextQuantity > MAX_CART_ITEM_QUANTITY) {
      return res.status(400).json({ message: `같은 상품은 최대 ${MAX_CART_ITEM_QUANTITY}개까지 담을 수 있습니다.` });
    }
    existingItem.quantity = nextQuantity;
    existingItem.price = product.price;
  } else {
    cart.items.push({
      product: product._id,
      selectedOption,
      price: product.price,
      quantity,
    });
  }

  await cart.save();
  await populateCart(cart);

  return res.status(201).json(serializeCart(cart));
}

async function updateCartItem(req, res) {
  const quantity = parseQuantity(req.body?.quantity, null);

  if (!isValidObjectId(req.params.itemId)) {
    return res.status(400).json({ message: '유효하지 않은 장바구니 항목 ID입니다.' });
  }

  if (quantity === null) {
    return res.status(400).json({ message: `상품 수량은 1개 이상 ${MAX_CART_ITEM_QUANTITY}개 이하의 정수여야 합니다.` });
  }

  const cart = await Cart.findOne({ user: req.auth.userId });
  const item = cart?.items.id(req.params.itemId);

  if (!item) {
    return res.status(404).json({ message: '장바구니 항목을 찾을 수 없습니다.' });
  }

  const product = await Product.findById(item.product).select('price');
  if (!product) {
    return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
  }

  item.quantity = quantity;
  item.price = product.price;
  await cart.save();
  await populateCart(cart);

  return res.status(200).json(serializeCart(cart));
}

async function removeCartItem(req, res) {
  if (!isValidObjectId(req.params.itemId)) {
    return res.status(400).json({ message: '유효하지 않은 장바구니 항목 ID입니다.' });
  }

  const cart = await Cart.findOne({ user: req.auth.userId });
  const item = cart?.items.id(req.params.itemId);

  if (!item) {
    return res.status(404).json({ message: '장바구니 항목을 찾을 수 없습니다.' });
  }

  item.deleteOne();
  await cart.save();
  await populateCart(cart);

  return res.status(200).json(serializeCart(cart));
}

async function clearCart(req, res) {
  const cart = await Cart.findOne({ user: req.auth.userId });

  if (cart) {
    cart.items = [];
    await cart.save();
  }

  return res.status(200).json(serializeCart(cart));
}

async function validateCartPrices(req, res) {
  const cart = await Cart.findOne({ user: req.auth.userId });
  await populateCart(cart);
  const serializedCart = serializeCart(cart);
  const unavailableItems = serializedCart.items.filter((item) => !item.product || item.product.price === undefined);
  const priceChanges = serializedCart.items
    .filter((item) => item.priceChanged)
    .map((item) => ({
      itemId: item._id,
      productId: item.product?._id,
      previousPrice: item.price,
      currentPrice: item.currentPrice,
    }));

  return res.status(200).json({
    valid: unavailableItems.length === 0 && priceChanges.length === 0,
    priceChanges,
    unavailableItemIds: unavailableItems.map((item) => item._id),
    cart: serializedCart,
  });
}

function handleCartError(error, req, res, next) {
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      message: '장바구니 정보가 올바르지 않습니다.',
      errors: Object.values(error.errors).map((validationError) => validationError.message),
    });
  }

  if (error.code === 11000 && error.keyPattern?.user) {
    return res.status(409).json({ message: '장바구니 요청이 중복되었습니다. 다시 시도해 주세요.' });
  }

  return next(error);
}

module.exports = {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart,
  validateCartPrices,
  handleCartError,
  serializeCart,
};
