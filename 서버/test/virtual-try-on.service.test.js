const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createTryOnPrompt,
  decodeImageDataUrl,
  downloadGeneratedImage,
  generateVirtualTryOn,
  getGeneratedImageUrl,
  isAllowedGeneratedImageUrl,
} = require('../src/services/virtual-try-on.service');

const sampleImage = `data:image/png;base64,${Buffer.from('sample-image').toString('base64')}`;

test('AI 가상 착장은 사람과 전체 코디 보드 두 장으로 요청한다', async () => {
  const calls = [];
  const generatedImage = Buffer.from('generated-image');
  const client = {
    config: { root: 'https://demo.hf.space' },
    async predict(endpoint, payload) {
      calls.push({ endpoint, payload });
      return { data: [{ url: '/gradio_api/file=result.png' }] };
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
    downloadGeneratedImage: async (imageUrl) => {
      assert.equal(imageUrl, 'https://demo.hf.space/gradio_api/file=result.png');
      return { imageBuffer: generatedImage, mimeType: 'image/png' };
    },
    timeoutMs: 1000,
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].endpoint, '/generate');
  assert.equal(calls[0].payload.input_images.length, 2);
  assert.equal(calls[0].payload.resolution, 1024);
  assert.equal(calls[0].payload.aspect_ratio, '3:4');
  assert.deepEqual(result.supports, ['top', 'bottom', 'bag', 'cap']);
  assert.equal(result.imageBuffer, generatedImage);
  assert.equal(result.mimeType, 'image/png');
});

test('AI 지시문에 상의, 하의, 가방, 모자 슬롯을 모두 포함한다', () => {
  const prompt = createTryOnPrompt();
  for (const label of ['TOP', 'BOTTOM', 'BAG', 'CAP']) {
    assert.match(prompt, new RegExp(label));
  }
  assert.match(prompt, /photorealistic virtual try-on/);
  assert.match(prompt, /Do not show the outfit board/);
});

test('개별 상품 착장은 상품 디자인 보존과 대상 영역만 변경하도록 지시한다', () => {
  const topPrompt = createTryOnPrompt({ mode: 'single', slot: 'top' });
  assert.match(topPrompt, /exact product reference/);
  assert.match(topPrompt, /Replace only the upper-body garment/);
  assert.match(topPrompt, /Do not redesign, simplify, recolor, substitute, or invent/);
  assert.match(topPrompt, /Preserve every non-target garment and accessory/);

  const bagPrompt = createTryOnPrompt({ mode: 'single', slot: 'accessory' });
  assert.match(bagPrompt, /Add the exact bag/);
});

test('개별 상품 착장은 지원하지 않는 상품 종류를 거절한다', () => {
  assert.throws(
    () => createTryOnPrompt({ mode: 'single', slot: 'shoes' }),
    (error) => error.status === 400,
  );
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
  assert.equal(
    getGeneratedImageUrl(
      { data: [{ url: '/gradio_api/file=result.png' }] },
      'https://demo.hf.space',
    ),
    'https://demo.hf.space/gradio_api/file=result.png',
  );
});

test('AI 결과는 Hugging Face 이미지 주소만 허용한다', () => {
  assert.equal(isAllowedGeneratedImageUrl('https://demo.hf.space/gradio_api/file=result.png'), true);
  assert.equal(isAllowedGeneratedImageUrl('https://example.com/generated.png'), false);
  assert.equal(isAllowedGeneratedImageUrl('http://demo.hf.space/result.png'), false);
});

test('AI 결과 이미지를 바이너리로 다운로드한다', async () => {
  const imageBuffer = Buffer.from('image-bytes');
  const result = await downloadGeneratedImage(
    'https://demo.hf.space/gradio_api/file=result.png',
    {
      token: 'hf_test',
      fetchImpl: async (url, options) => {
        assert.equal(url, 'https://demo.hf.space/gradio_api/file=result.png');
        assert.equal(options.headers.Authorization, 'Bearer hf_test');
        return new Response(imageBuffer, {
          status: 200,
          headers: { 'Content-Type': 'image/png' },
        });
      },
    },
  );

  assert.equal(result.mimeType, 'image/png');
  assert.deepEqual(result.imageBuffer, imageBuffer);
});
