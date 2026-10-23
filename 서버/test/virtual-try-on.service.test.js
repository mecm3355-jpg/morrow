const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createTryOnPrompt,
  decodeImageDataUrl,
  generateVirtualTryOn,
  getGeneratedImageUrl,
} = require('../src/services/virtual-try-on.service');

const sampleImage = `data:image/png;base64,${Buffer.from('sample-image').toString('base64')}`;

test('AI 가상 착장은 사람과 전체 코디 보드 두 장으로 요청한다', async () => {
  const calls = [];
  const client = {
    async predict(endpoint, payload) {
      calls.push({ endpoint, payload });
      return { data: [{ url: 'https://example.com/generated.png' }] };
    },
  };

  const result = await generateVirtualTryOn({
    personImage: sampleImage,
    outfitBoardImage: sampleImage,
  }, {
    connectToSpace: async () => ({
      client,
      handleFile: (buffer) => ({ size: buffer.length }),
    }),
    timeoutMs: 1000,
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].endpoint, '/generate');
  assert.equal(calls[0].payload.input_images.length, 2);
  assert.equal(calls[0].payload.resolution, 1024);
  assert.equal(calls[0].payload.aspect_ratio, '3:4');
  assert.deepEqual(result.supports, ['top', 'bottom', 'bag', 'cap']);
  assert.equal(result.imageUrl, 'https://example.com/generated.png');
});

test('AI 지시문에 상의, 하의, 가방, 모자 슬롯을 모두 포함한다', () => {
  const prompt = createTryOnPrompt();
  for (const label of ['TOP', 'BOTTOM', 'BAG', 'CAP']) {
    assert.match(prompt, new RegExp(label));
  }
  assert.match(prompt, /photorealistic virtual try-on/);
  assert.match(prompt, /Do not show the outfit board/);
});

test('이미지가 아닌 데이터 URL은 거절한다', () => {
  assert.throws(
    () => decodeImageDataUrl('data:text/plain;base64,dGVzdA==', '인물'),
    (error) => error.status === 400,
  );
});

test('Gradio 갤러리 결과 URL을 추출한다', () => {
  assert.equal(
    getGeneratedImageUrl({ data: [{ image: { url: 'https://example.com/result.png' } }] }),
    'https://example.com/result.png',
  );
});
