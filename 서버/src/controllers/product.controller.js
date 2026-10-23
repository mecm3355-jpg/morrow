const mongoose = require('mongoose');

const Product = require('../models/product.model');
const {
  MAX_OUTFIT_PRODUCTS,
  generateTryOnImage,
} = require('../services/try-on-image.service');

const productFields = ['sku', 'name', 'price', 'category', 'image', 'spinImages', 'description'];
const requiredProductFields = ['sku', 'name', 'price', 'category', 'image'];
const PRODUCTS_PER_PAGE = 10;

function pickProductFields(body = {}) {
  return productFields.reduce((productData, field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      productData[field] = body[field];
    }

    return productData;
  }, {});
}

function findMissingFields(productData) {
  return requiredProductFields.filter((field) => {
    const value = productData[field];
    return value === undefined
      || value === null
      || (typeof value === 'string' && !value.trim());
  });
}

function isValidProductId(id) {
  return mongoose.isObjectIdOrHexString(id);
}

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function createProduct(req, res) {
  const productData = pickProductFields(req.body);
  const missingFields = findMissingFields(productData);

  if (missingFields.length > 0) {
    return res.status(400).json({
      message: '필수 입력값을 모두 입력해 주세요.',
      fields: missingFields,
    });
  }

  const product = await Product.create(productData);
  return res.status(201).json(product);
}

async function getProducts(req, res) {
  const requestedPage = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
  const filter = {};

  if (search) {
    const searchExpression = new RegExp(escapeRegularExpression(search), 'i');
    filter.$or = [
      { name: searchExpression },
      { sku: searchExpression },
    ];
  }

  if (category && category !== '전체') {
    filter.category = category;
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [total, totalProducts, categories, priceSummary, recentProducts] = await Promise.all([
    Product.countDocuments(filter),
    Product.countDocuments(),
    Product.distinct('category'),
    Product.aggregate([
      { $group: { _id: null, averagePrice: { $avg: '$price' } } },
    ]),
    Product.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PRODUCTS_PER_PAGE));
  const page = Math.min(requestedPage, totalPages);
  const skip = (page - 1) * PRODUCTS_PER_PAGE;
  const products = await Product.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(PRODUCTS_PER_PAGE);

  return res.status(200).json({
    products,
    pagination: {
      page,
      pageSize: PRODUCTS_PER_PAGE,
      total,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
    },
    summary: {
      totalProducts,
      categoryCount: categories.length,
      averagePrice: Math.round(priceSummary[0]?.averagePrice || 0),
      recentProducts,
    },
    filters: {
      categories: categories.sort((first, second) => first.localeCompare(second, 'ko')),
    },
  });
}

async function getAllProducts(req, res) {
  const products = await Product.find()
    .sort({ createdAt: -1 })
    .lean();

  return res.status(200).json(products);
}

async function getProductById(req, res) {
  if (!isValidProductId(req.params.id)) {
    return res.status(400).json({ message: '유효하지 않은 상품 ID입니다.' });
  }

  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
  }

  return res.status(200).json(product);
}

async function generateProductTryOn(req, res) {
  const requestedIds = Array.isArray(req.body?.productIds)
    ? [...new Set(req.body.productIds.map((id) => String(id)))]
    : [];

  if (requestedIds.length === 0 || requestedIds.length > MAX_OUTFIT_PRODUCTS) {
    return res.status(400).json({
      message: `AI 가상착장은 1개에서 ${MAX_OUTFIT_PRODUCTS}개 상품까지 지원합니다.`,
    });
  }

  if (requestedIds.some((id) => !isValidProductId(id))) {
    return res.status(400).json({ message: '유효하지 않은 상품이 포함되어 있습니다.' });
  }

  const products = await Product.find({ _id: { $in: requestedIds } })
    .select('name category image')
    .lean();
  const productsById = new Map(products.map((product) => [String(product._id), product]));
  const orderedProducts = requestedIds.map((id) => productsById.get(id)).filter(Boolean);

  if (orderedProducts.length !== requestedIds.length) {
    return res.status(404).json({ message: '가상착장에 사용할 상품을 찾을 수 없습니다.' });
  }

  const clientOrigin = req.get('origin') || '';
  const mannequinUrl = process.env.AI_TRYON_MANNEQUIN_URL
    || (clientOrigin ? new URL('/products/around/mannequin-front.png', clientOrigin).toString() : '');

  if (!mannequinUrl) {
    return res.status(503).json({
      message: 'AI 가상착장용 마네킹 이미지 주소가 설정되지 않았습니다.',
    });
  }

  const result = await generateTryOnImage({
    products: orderedProducts,
    mannequinUrl,
    clientOrigin,
  });

  return res.status(200).json({
    ...result,
    productIds: requestedIds,
  });
}

async function updateProduct(req, res) {
  if (!isValidProductId(req.params.id)) {
    return res.status(400).json({ message: '유효하지 않은 상품 ID입니다.' });
  }

  const updateData = pickProductFields(req.body);

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ message: '수정할 상품 정보를 입력해 주세요.' });
  }

  const product = await Product.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!product) {
    return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
  }

  return res.status(200).json(product);
}

async function deleteProduct(req, res) {
  if (!isValidProductId(req.params.id)) {
    return res.status(400).json({ message: '유효하지 않은 상품 ID입니다.' });
  }

  const product = await Product.findByIdAndDelete(req.params.id);

  if (!product) {
    return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
  }

  return res.status(200).json(product);
}

function handleProductError(error, req, res, next) {
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      message: '상품 정보가 올바르지 않습니다.',
      errors: Object.values(error.errors).map((validationError) => validationError.message),
    });
  }

  if (error.code === 11000 && error.keyPattern?.sku) {
    return res.status(409).json({ message: '이미 사용 중인 SKU입니다.' });
  }

  return next(error);
}

module.exports = {
  createProduct,
  getProducts,
  getAllProducts,
  getProductById,
  generateProductTryOn,
  updateProduct,
  deleteProduct,
  handleProductError,
};
