const mongoose = require('mongoose');

const Product = require('../models/product.model');

const productFields = ['sku', 'name', 'price', 'category', 'image', 'description'];
const requiredProductFields = ['sku', 'name', 'price', 'category', 'image'];

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
  const products = await Product.find().sort({ createdAt: -1 });
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
  getProductById,
  updateProduct,
  deleteProduct,
  handleProductError,
};
