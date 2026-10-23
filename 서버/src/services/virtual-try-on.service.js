const DEFAULT_SPACE_ID = 'Qwen/Qwen-Image-2.1';
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const TRY_ON_TIMEOUT_MS = 4 * 60 * 1000;

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

function getGeneratedImageUrl(result) {
  const output = result?.data?.[0];
  if (typeof output === 'string' && /^https:\/\//.test(output)) return output;
  if (typeof output?.url === 'string') return output.url;
  if (typeof output?.path === 'string' && /^https:\/\//.test(output.path)) return output.path;
  if (typeof output?.image?.url === 'string') return output.image.url;
  return '';
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
    'Preserve the subject identity, face, hair, hands, full-body front pose, body proportions, framing, and background.',
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

  await withTimeout(client.predict('/prepare_request', {
    input_images: [
      { image: handleFile(personBuffer), caption: null },
      { image: handleFile(outfitBoardBuffer), caption: null },
    ],
    original_prompt: prompt,
    enable_extend: false,
    custom_size: false,
    quality: 'speed',
    seed: 42,
    randomize_seed: false,
  }), dependencies.timeoutMs);

  const result = await withTimeout(client.predict('/generate_request', {
    original_prompt: prompt,
    enable_extend: false,
    custom_size: false,
    log_dir: './generation_logs_paper_case',
    seed: 42,
    height: 1536,
    width: 2688,
    negative_prompt: ' ',
  }), dependencies.timeoutMs);
  const imageUrl = getGeneratedImageUrl(result);

  if (!imageUrl) {
    throw createHttpError(
      '무료 AI가 결과 이미지를 만들지 못했습니다. 다른 사진으로 다시 시도해 주세요.',
      502,
    );
  }

  return {
    imageUrl,
    provider: 'Hugging Face ZeroGPU',
    model: process.env.HF_SPACE_ID || DEFAULT_SPACE_ID,
    supports: ['top', 'bottom', 'bag', 'cap'],
  };
}

module.exports = {
  createTryOnPrompt,
  decodeImageDataUrl,
  generateVirtualTryOn,
  getGeneratedImageUrl,
};
