require('dotenv').config();

const mongoose = require('mongoose');
const Product = require('../src/models/product.model');

function spriteFrames(fileName) {
  return Array.from(
    { length: 8 },
    (_, frame) => `/products/around/${fileName}#frame=${frame}&cols=4&rows=2`,
  );
}

const products = [
  {
    sku: 'MORROW-TOP-001',
    name: '아이보리 코튼 오버셔츠',
    price: 89000,
    category: '상의',
    image: '/products/around/top-front.png',
    spinImages: spriteFrames('top-turntable.png'),
    description: '탄탄한 코튼 트윌과 여유로운 실루엣으로 사계절 편안하게 걸칠 수 있는 오버셔츠입니다.',
  },
  {
    sku: 'MORROW-TOP-002',
    name: '딥 네이비 니트 가디건',
    price: 79000,
    category: '상의',
    image: '/products/around/cardigan-front.png',
    spinImages: spriteFrames('cardigan-turntable.png'),
    description: '차분한 네이비 컬러와 부드러운 니트 조직이 어우러진 여유로운 핏의 데일리 가디건입니다.',
  },
  {
    sku: 'MORROW-BOTTOM-001',
    name: '차콜 와이드 슬랙스',
    price: 76000,
    category: '하의',
    image: '/products/around/bottom-front.png',
    spinImages: spriteFrames('bottom-turntable.png'),
    description: '깊은 차콜 컬러와 자연스럽게 떨어지는 와이드 실루엣으로 완성한 울 블렌드 슬랙스입니다.',
  },
  {
    sku: 'MORROW-BOTTOM-002',
    name: '샌드 코튼 카고 팬츠',
    price: 72000,
    category: '하의',
    image: '/products/around/cargo-front.png',
    spinImages: spriteFrames('cargo-turntable.png'),
    description: '낮은 볼륨의 카고 포켓과 단정한 스트레이트 핏으로 활용도를 높인 코튼 팬츠입니다.',
  },
  {
    sku: 'MORROW-ACC-001',
    name: '블랙 레더 크로스백',
    price: 68000,
    category: '악세사리',
    image: '/products/around/accessory-front.png',
    spinImages: spriteFrames('accessory-turntable.png'),
    description: '은은한 결의 블랙 레더와 간결한 곡선으로 어떤 옷차림에도 자연스럽게 어울리는 크로스백입니다.',
  },
  {
    sku: 'MORROW-ACC-002',
    name: '토프 코튼 볼캡',
    price: 39000,
    category: '악세사리',
    image: '/products/around/cap-front.png',
    spinImages: spriteFrames('cap-turntable.png'),
    description: '차분한 토프 컬러와 군더더기 없는 6패널 구조로 완성한 데일리 코튼 볼캡입니다.',
  },
];

async function replaceProducts() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI 환경변수가 설정되지 않았습니다.');
  if (!process.argv.includes('--confirm=replace-all')) {
    throw new Error('전체 상품 교체를 확인하려면 --confirm=replace-all 옵션이 필요합니다.');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const previousProducts = await Product.find().select('_id sku name').lean();
  let createdProducts = [];

  try {
    createdProducts = await Product.insertMany(products);
    await Product.deleteMany({ _id: { $in: previousProducts.map((product) => product._id) } });
  } catch (error) {
    if (createdProducts.length) {
      await Product.deleteMany({ _id: { $in: createdProducts.map((product) => product._id) } });
    }
    throw error;
  }

  const savedProducts = await Product.find().sort({ sku: 1 }).select('sku name category spinImages').lean();
  console.log(JSON.stringify({
    removed: previousProducts.length,
    created: savedProducts.length,
    products: savedProducts.map((product) => ({
      sku: product.sku,
      name: product.name,
      category: product.category,
      frames: product.spinImages.length,
    })),
  }, null, 2));
}

replaceProducts()
  .then(() => mongoose.disconnect())
  .catch(async (error) => {
    console.error(error.message);
    try { await mongoose.disconnect(); } catch {}
    process.exitCode = 1;
  });
