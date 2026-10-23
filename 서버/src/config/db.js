const mongoose = require('mongoose');

let connectionPromise = null;

async function connectDatabase() {
  const mongoUri = process.env.MONGODB_ATLAS_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_ATLAS_URI 환경변수가 설정되지 않았습니다.');
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(mongoUri).finally(() => {
      connectionPromise = null;
    });
  }

  await connectionPromise;
  console.log('MongoDB에 연결되었습니다.');

  return mongoose.connection;
}

module.exports = connectDatabase;
