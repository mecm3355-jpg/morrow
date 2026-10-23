const DEFAULT_SPACE_ID = 'hugging-apps/qwen-qwen-image-2-1-turbo';
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_RESULT_IMAGE_BYTES = 4 * 1024 * 1024;
const TRY_ON_TIMEOUT_MS = 4 * 60 * 1000;
const RESULT_DOWNLOAD_TIMEOUT_MS = 30 * 1000;

function createHttpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function decodeImageDataUrl(value, label) {
  if (typeof value !== 'string') {
    throw createHttpError(`${label} 이미지가 필요합니다.`, 400);
  }

  const match = value.match(/^data:image\/(png|jpe?g|webp);base64,([a-zA-Z0-9+/=\s]+)$/);
  if (!match) {
    throw createHttpError(`${label} 이미지 형식이 올바르지 않습니다.`, 400);
  }

  const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
    throw createHttpError(`${label} 이미지는 3MB 이하로 준비해 주세요.`, 413);
  }
  return buffer;
}

function getGeneratedImageUrl(result, baseUrl = '') {
  const output = result?.data?.[0];
  const value = typeof output === 'string'
    ? output
    : output?.url || output?.path || output?.image?.url || '';

  if (typeof value !== 'string' || !value) return '';
  try {
    return new URL(value, baseUrl || undefined).toString();
  } catch {
    return '';
  }
}

function isAllowedGeneratedImageUrl(imageUrl) {
  try {
    const url = new URL(imageUrl);
    return url.protocol === 'https:' && (
      url.hostname.endsWith('.hf.space')
      || url.hostname === 'huggingface.co'
      || url.hostname.endsWith('.huggingface.co')
    );
  } catch {
    return false;
  }
}

async function downloadGeneratedImage(
  imageUrl,
  {
    fetchImpl = fetch,
    token = process.env.HF_TOKEN,
    timeoutMs = RESULT_DOWNLOAD_TIMEOUT_MS,
  } = {},
) {
  if (!isAllowedGeneratedImageUrl(imageUrl)) {
    throw createHttpError('AI 결과 이미지 주소를 확인하지 못했습니다.', 502);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = { Accept: 'image/avif,image/webp,image/png,image/jpeg' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetchImpl(imageUrl, {
      headers,
      redirect: 'follow',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw createHttpError('AI 결과 이미지를 내려받지 못했습니다.', 502);
    }

    const mimeType = (response.headers.get('content-type') || '')
      .split(';')[0]
      .trim()
      .toLowerCase();
    if (!['image/avif', 'image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
      throw createHttpError('AI가 올바른 이미지 파일을 반환하지 않았습니다.', 502);
    }

    const declaredSize = Number(response.headers.get('content-length') || 0);
    if (declaredSize > MAX_RESULT_IMAGE_BYTES) {
      throw createHttpError('AI 결과 이미지 용량이 너무 큽니다.', 502);
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());
    if (!imageBuffer.length || imageBuffer.length > MAX_RESULT_IMAGE_BYTES) {
      throw createHttpError('AI 결과 이미지 용량이 올바르지 않습니다.', 502);
    }

    return { imageBuffer, mimeType };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw createHttpError('AI 결과 이미지 다운로드 시간이 초과되었습니다.', 504);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function withTimeout(promise, timeoutMs = TRY_ON_TIMEOUT_MS) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(createHttpError(
        '무료 AI 대기 시간이 길어 요청을 종료했습니다. 잠시 후 다시 시도해 주세요.',
        504,
      ));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

function createTryOnPrompt() {
  return [
    'Image 1 is the full-body person or mannequin to dress.',
    'Image 2 is an outfit board whose occupied cells are labeled TOP, BOTTOM, BAG, and CAP.',
    'Dress the subject in image 1 with every item shown in the occupied labeled cells of image 2.',
    'Make the top and bottom naturally fitted to the body, put the cap on the head, and wear the bag naturally on one shoulder.',
    'Make every supplied item clearly visible. Do not omit, duplicate, recolor, or replace any item.',
    'Render a photorealistic virtual try-on with natural cloth draping, wrinkles, seams, lighting, shadows, and body occlusion.',
    'Preserve the subject identity, face, hair, hands, full-body front pose, body proportions, framing, and background.',
    'Return one clean final full-body image of the dressed subject only. Do not show the outfit board, labels, product cutouts, a collage, or a before-and-after comparison.',
  ].join(' ');
}

async function connectToSpace() {
  const { Client, handle_file: handleFile } = await import('@gradio/client');
  const options = { events: ['status', 'data'] };
  if (process.env.HF_TOKEN) options.token = process.env.HF_TOKEN;

  const client = await Client.connect(
    process.env.HF_SPACE_ID || DEFAULT_SPACE_ID,
    options,
  );
  return { client, handleFile };
}

async function generateVirtualTryOn(
  { personImage, outfitBoardImage },
  dependencies = {},
) {
  if (process.env.HF_VIRTUAL_TRYON_ENABLED === 'false') {
    throw createHttpError('무료 AI 가상 착장이 현재 비활성화되어 있습니다.', 503);
  }

  const personBuffer = decodeImageDataUrl(personImage, '인물');
  const outfitBoardBuffer = decodeImageDataUrl(outfitBoardImage, '코디 보드');
  const connect = dependencies.connectToSpace || connectToSpace;
  const { client, handleFile } = await connect();
  const prompt = createTryOnPrompt();
  const downloadImage = dependencies.downloadGeneratedImage || downloadGeneratedImage;

  try {
    const result = await withTimeout(client.predict('/generate', {
      prompt,
      input_images: [
        { image: handleFile(personBuffer), caption: null },
        { image: handleFile(outfitBoardBuffer), caption: null },
      ],
      seed: 42,
      resolution: 1024,
      aspect_ratio: '3:4',
    }), dependencies.timeoutMs);
    const imageUrl = getGeneratedImageUrl(
      result,
      client.config?.root || client.config?.root_url || '',
    );

    if (!imageUrl) {
      throw createHttpError(
        '무료 AI가 결과 이미지를 만들지 못했습니다. 다른 사진으로 다시 시도해 주세요.',
        502,
      );
    }

    const { imageBuffer, mimeType } = await downloadImage(imageUrl, {
      token: process.env.HF_TOKEN,
      timeoutMs: dependencies.downloadTimeoutMs,
    });

    return {
      imageBuffer,
      mimeType,
      provider: 'Hugging Face ZeroGPU',
      model: process.env.HF_SPACE_ID || DEFAULT_SPACE_ID,
      supports: ['top', 'bottom', 'bag', 'cap'],
    };
  } finally {
    await client.close?.();
  }
}

module.exports = {
  createTryOnPrompt,
  decodeImageDataUrl,
  downloadGeneratedImage,
  generateVirtualTryOn,
  getGeneratedImageUrl,
  isAllowedGeneratedImageUrl,
};
