const mongoose = require('mongoose');

async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI 환경변수가 설정되지 않았습니다.');
  }

  await mongoose.connect(mongoUri);
  console.log('MongoDB에 연결되었습니다.');
}

module.exports = connectDatabase;
