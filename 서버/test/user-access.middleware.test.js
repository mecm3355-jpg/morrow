const test = require('node:test');
const assert = require('node:assert/strict');

const User = require('../src/models/user.model');
const authorizeSelfOrAdmin = require('../src/middleware/user-access.middleware');

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('본인은 추가 DB 조회 없이 접근할 수 있다', async () => {
  const request = { auth: { userId: 'user-1' }, params: { id: 'user-1' } };
  const response = createResponse();
  let nextCalled = false;

  await authorizeSelfOrAdmin(request, response, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(response.statusCode, 200);
});

test('관리자는 다른 사용자 정보에 접근할 수 있다', async () => {
  const originalFindById = User.findById;
  User.findById = () => ({ select: async () => ({ user_type: 'admin' }) });
  const request = { auth: { userId: 'admin-1' }, params: { id: 'user-2' } };
  const response = createResponse();
  let nextCalled = false;

  try {
    await authorizeSelfOrAdmin(request, response, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    assert.equal(request.auth.userType, 'admin');
  } finally {
    User.findById = originalFindById;
  }
});

test('일반 사용자는 다른 사용자 정보에 접근할 수 없다', async () => {
  const originalFindById = User.findById;
  User.findById = () => ({ select: async () => ({ user_type: 'customer' }) });
  const request = { auth: { userId: 'user-1' }, params: { id: 'user-2' } };
  const response = createResponse();
  let nextCalled = false;

  try {
    await authorizeSelfOrAdmin(request, response, () => { nextCalled = true; });
    assert.equal(nextCalled, false);
    assert.equal(response.statusCode, 403);
  } finally {
    User.findById = originalFindById;
  }
});
