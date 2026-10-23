const assert = require('node:assert/strict');
const test = require('node:test');

const mongoose = require('mongoose');

test('database connection is recreated after a settled connection is lost', async () => {
  const modulePath = require.resolve('../src/config/db');
  const originalConnect = mongoose.connect;
  const originalReadyState = mongoose.connection._readyState;
  const originalUri = process.env.MONGODB_ATLAS_URI;
  let connectCalls = 0;

  process.env.MONGODB_ATLAS_URI = 'mongodb://example.invalid/test';
  mongoose.connection._readyState = 0;
  mongoose.connect = async () => {
    connectCalls += 1;
    mongoose.connection._readyState = 1;
    return mongoose;
  };
  delete require.cache[modulePath];

  try {
    const connectDatabase = require(modulePath);
    await connectDatabase();

    mongoose.connection._readyState = 0;
    await connectDatabase();

    assert.equal(connectCalls, 2);
  } finally {
    mongoose.connect = originalConnect;
    mongoose.connection._readyState = originalReadyState;
    delete require.cache[modulePath];

    if (originalUri === undefined) delete process.env.MONGODB_ATLAS_URI;
    else process.env.MONGODB_ATLAS_URI = originalUri;
  }
});
