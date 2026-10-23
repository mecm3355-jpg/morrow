const DEFAULT_IMAGE_MODEL = 'openai/gpt-image-2.5-sunburst';
const MAX_INPUT_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_OUTPUT_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_OUTFIT_PRODUCTS = 6;
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function createHttpError(status, message, code) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.expose = true;
  return error;
}

function getAllowedImageHosts(clientOrigin) {
  const hosts = new Set(['res.cloudinary.com']);
  const configuredHosts = (process.env.AI_TRYON_ALLOWED_IMAGE_HOSTS || '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

  configuredHosts.forEach((host) => hosts.add(host));

  if (clientOrigin) {
    try {
      hosts.add(new URL(clientOrigin).hostname.toLowerCase());
    } catch {
      // CORS middleware validates browser origins. Invalid values are ignored here.
    }
  }

  return hosts;
}

function resolveImageUrl(imageUrl, clientOrigin) {
  if (typeof imageUrl !== 'string' || !imageUrl.trim()) {
    throw createHttpError(400, '착장에 사용할 상품 이미지가 없습니다.', 'INVALID_IMAGE_URL');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(imageUrl, clientOrigin || undefined);
  } catch {
    throw createHttpError(400, '상품 이미지 주소가 올바르지 않습니다.', 'INVALID_IMAGE_URL');
  }

  const isLocalDevelopment = ['localhost', '127.0.0.1'].includes(parsedUrl.hostname)
    && parsedUrl.protocol === 'http:';
  if (parsedUrl.protocol !== 'https:' && !isLocalDevelopment) {
    throw createHttpError(400, 'HTTPS 상품 이미지만 AI 착장에 사용할 수 있습니다.', 'INVALID_IMAGE_PROTOCOL');
  }

  if (!getAllowedImageHosts(clientOrigin).has(parsedUrl.hostname.toLowerCase())) {
    throw createHttpError(400, '허용된 이미지 저장소의 상품 이미지만 사용할 수 있습니다.', 'IMAGE_HOST_NOT_ALLOWED');
  }

  return parsedUrl;
}

async function downloadImage(imageUrl, clientOrigin) {
  let currentUrl = resolveImageUrl(imageUrl, clientOrigin);

  for (let redirectCount = 0; redirectCount <= 2; redirectCount += 1) {
    const response = await fetch(currentUrl, {
      redirect: 'manual',
      headers: { Accept: 'image/png,image/webp,image/jpeg' },
    });

    if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
      currentUrl = resolveImageUrl(
        new URL(response.headers.get('location'), currentUrl).toString(),
        clientOrigin,
      );
      continue;
    }

    if (!response.ok) {
      throw createHttpError(422, '상품 이미지를 불러오지 못했습니다.', 'IMAGE_DOWNLOAD_FAILED');
    }

    const contentType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
    if (!SUPPORTED_IMAGE_TYPES.has(contentType)) {
      throw createHttpError(422, 'JPG, PNG, WEBP 이미지만 AI 착장에 사용할 수 있습니다.', 'UNSUPPORTED_IMAGE_TYPE');
    }

    const declaredSize = Number(response.headers.get('content-length') || 0);
    if (declaredSize > MAX_INPUT_IMAGE_BYTES) {
      throw createHttpError(413, 'AI 착장 이미지는 장당 10MB 이하여야 합니다.', 'IMAGE_TOO_LARGE');
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > MAX_INPUT_IMAGE_BYTES) {
      throw createHttpError(413, 'AI 착장 이미지는 장당 10MB 이하여야 합니다.', 'IMAGE_TOO_LARGE');
    }

    return { bytes, contentType };
  }

  throw createHttpError(422, '상품 이미지의 리디렉션이 너무 많습니다.', 'TOO_MANY_REDIRECTS');
}

function buildTryOnPrompt(products) {
  const productDescription = products
    .map((product, index) => `${index + 1}. ${product.category}: ${product.name}`)
    .join('\n');

  return `
Create a photorealistic ecommerce virtual try-on composite.

The first input image is the exact gray, front-facing full-body mannequin and is the base image.
All remaining input images are product references that must be worn together by that mannequin:
${productDescription}

Preserve the mannequin's exact pose, body proportions, scale, camera angle, head, hands, legs, and framing. Remove every product-photo background. Fit and naturally drape each product onto the correct body area. Align shoulders, sleeves, waist, hips, and hems. Preserve each product's colors, materials, buttons, seams, patterns, logos, and distinctive construction as faithfully as possible. Apply realistic occlusion, layering, folds, contact shadows, and lighting consistent with the mannequin.

Return one centered full-body image on a transparent background. Change only by dressing the mannequin in the supplied products. Do not add a face, hair, unrelated garments, accessories, text, labels, logos that are not present in the products, watermarks, duplicate limbs, floating fabric, or any residual rectangular photo background.
  `.trim();
}

async function generateTryOnImage({ products, mannequinUrl, clientOrigin, generateImageImpl }) {
  if (!generateImageImpl && process.env.AI_TRYON_ENABLED !== 'true') {
    throw createHttpError(
      503,
      'AI 가상착장은 비용 사용 동의 후 관리자가 활성화해야 합니다.',
      'AI_TRYON_DISABLED',
    );
  }

  if (!generateImageImpl && !process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    throw createHttpError(
      503,
      'AI 가상착장이 아직 설정되지 않았습니다. Vercel AI Gateway 연결을 확인해 주세요.',
      'AI_TRYON_NOT_CONFIGURED',
    );
  }

  if (!Array.isArray(products) || products.length === 0 || products.length > MAX_OUTFIT_PRODUCTS) {
    throw createHttpError(
      400,
      `AI 가상착장은 1개에서 ${MAX_OUTFIT_PRODUCTS}개 상품까지 지원합니다.`,
      'INVALID_PRODUCT_COUNT',
    );
  }

  const inputImages = await Promise.all([
    downloadImage(mannequinUrl, clientOrigin),
    ...products.map((product) => downloadImage(product.image, clientOrigin)),
  ]);

  const model = process.env.AI_TRYON_MODEL || DEFAULT_IMAGE_MODEL;
  try {
    const generateImage = generateImageImpl || (await import('ai')).generateImage;
    const { image } = await generateImage({
      model,
      prompt: {
        text: buildTryOnPrompt(products),
        images: inputImages.map(({ bytes }) => bytes),
      },
      size: '1024x1024',
      abortSignal: AbortSignal.timeout(240_000),
    });

    if (!image?.base64 || !image?.uint8Array) {
      throw createHttpError(502, 'AI가 생성한 착장 이미지를 받지 못했습니다.', 'EMPTY_AI_IMAGE');
    }

    if (image.uint8Array.byteLength > MAX_OUTPUT_IMAGE_BYTES) {
      throw createHttpError(502, '생성된 착장 이미지가 너무 큽니다. 다시 시도해 주세요.', 'AI_IMAGE_TOO_LARGE');
    }

    return {
      imageDataUrl: `data:${image.mediaType || 'image/png'};base64,${image.base64}`,
      model,
    };
  } catch (error) {
    if (error?.expose) throw error;

    const isRateLimited = error?.status === 429 || error?.statusCode === 429;
    const safeError = createHttpError(
      isRateLimited ? 429 : 502,
      isRateLimited
        ? 'AI 가상착장 요청이 많습니다. 잠시 후 다시 시도해 주세요.'
        : 'AI 가상착장 이미지를 생성하지 못했습니다.',
      'AI_IMAGE_GENERATION_FAILED',
    );
    safeError.cause = error;
    throw safeError;
  }
}

module.exports = {
  MAX_OUTFIT_PRODUCTS,
  buildTryOnPrompt,
  generateTryOnImage,
  resolveImageUrl,
};
