const { generateVirtualTryOn } = require('../services/virtual-try-on.service');

async function createVirtualTryOn(req, res, next) {
  try {
    const result = await generateVirtualTryOn(req.body ?? {});
    return res.json(result);
  } catch (error) {
    if (!error.status) {
      const message = String(error.message || '');
      error.status = /quota|rate|queue|429|gpu|duration/i.test(message) ? 429 : 502;
      error.message = error.status === 429
        ? '무료 AI 사용량이 많습니다. 잠시 후 다시 시도하거나 무료 수동 합성을 이용해 주세요.'
        : '무료 AI 가상 착장 연결에 실패했습니다. 무료 수동 합성은 계속 사용할 수 있습니다.';
    }
    return next(error);
  }
}

function getVirtualTryOnStatus(req, res) {
  res.json({
    enabled: process.env.HF_VIRTUAL_TRYON_ENABLED !== 'false',
    provider: 'Hugging Face ZeroGPU',
    model: process.env.HF_SPACE_ID || 'Qwen/Qwen-Image-2.1',
    supports: ['top', 'bottom', 'bag', 'cap'],
    use: 'research-and-evaluation',
  });
}

module.exports = { createVirtualTryOn, getVirtualTryOnStatus };
