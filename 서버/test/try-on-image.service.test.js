const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildTryOnPrompt,
  generateTryOnImage,
  resolveImageUrl,
} = require('../src/services/try-on-image.service');

test('AI 착장 프롬프트에 상품과 마네킹 보존 조건을 포함한다', () => {
  const prompt = buildTryOnPrompt([
    { name: '가죽 트렌치코트', category: '상의' },
    { name: '와이드 데님', category: '하의' },
  ]);

  assert.match(prompt, /가죽 트렌치코트/);
  assert.match(prompt, /와이드 데님/);
  assert.match(prompt, /Preserve the mannequin's exact pose/);
  assert.match(prompt, /transparent background/);
});

test('상품 이미지는 Cloudinary 또는 허용된 클라이언트 호스트만 사용한다', () => {
  const clientOrigin = 'https://morrow.example';

  assert.equal(
    resolveImageUrl('https://res.cloudinary.com/demo/image/upload/coat.webp', clientOrigin).hostname,
    'res.cloudinary.com',
  );
  assert.equal(
    resolveImageUrl('/products/around/mannequin-front.png', clientOrigin).toString(),
    'https://morrow.example/products/around/mannequin-front.png',
  );
  assert.throws(
    () => resolveImageUrl('https://untrusted.example/coat.png', clientOrigin),
    /허용된 이미지 저장소/,
  );
});

test('마네킹과 상품 이미지를 AI Gateway 모델로 보내고 생성 이미지를 반환한다', async () => {
  const originalFetch = global.fetch;
  const downloadCalls = [];

  global.fetch = async (url, options = {}) => {
    downloadCalls.push({ url: String(url), options });
    return new Response(Buffer.from('mock-image'), {
      status: 200,
      headers: { 'content-type': 'image/png' },
    });
  };

  const generatedBytes = Buffer.from('generated-image');
  const generateImageCalls = [];
  const generateImageImpl = async (options) => {
    generateImageCalls.push(options);
    return {
      image: {
        base64: generatedBytes.toString('base64'),
        uint8Array: generatedBytes,
        mediaType: 'image/webp',
      },
    };
  };

  try {
    const result = await generateTryOnImage({
      products: [{
        name: '가죽 코트',
        category: '상의',
        image: 'https://res.cloudinary.com/demo/image/upload/coat.png',
      }],
      mannequinUrl: 'https://morrow.example/products/around/mannequin-front.png',
      clientOrigin: 'https://morrow.example',
      generateImageImpl,
    });

    assert.equal(downloadCalls.length, 2);
    assert.equal(generateImageCalls.length, 1);
    assert.equal(generateImageCalls[0].model, 'openai/gpt-image-2.5-sunburst');
    assert.equal(generateImageCalls[0].prompt.images.length, 2);
    assert.match(generateImageCalls[0].prompt.text, /가죽 코트/);
    assert.equal(result.imageDataUrl, `data:image/webp;base64,${generatedBytes.toString('base64')}`);
  } finally {
    global.fetch = originalFetch;
  }
});
