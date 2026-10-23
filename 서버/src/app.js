const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const healthRouter = require('./routes/health.routes');
const cartRouter = require('./routes/cart.routes');
const orderRouter = require('./routes/order.routes');
const productRouter = require('./routes/product.routes');
const userRouter = require('./routes/user.routes');
const connectDatabase = require('./config/db');

const app = express();
const isDevelopment = app.get('env') === 'development';
const defaultClientOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const environmentClientOrigins = (process.env.CLIENT_URLS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const vercelClientOrigins = [
  process.env.VERCEL_URL,
  process.env.VERCEL_BRANCH_URL,
  process.env.VERCEL_PROJECT_PRODUCTION_URL,
]
  .filter(Boolean)
  .map((host) => `https://${host}`);
const allowedOrigins = new Set([
  ...defaultClientOrigins,
  ...environmentClientOrigins,
  ...vercelClientOrigins,
]);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    const error = new Error('허용되지 않은 출처의 요청입니다.');
    error.status = 403;
    return callback(error);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      upgradeInsecureRequests: isDevelopment ? null : [],
    },
  },
  strictTransportSecurity: isDevelopment ? false : undefined,
}));
app.use(cors(corsOptions));
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: true, limit: '256kb' }));

app.use(async (req, res, next) => {
  try {
    await connectDatabase();
    next();
  } catch (error) {
    next(error);
  }
});

app.get('/', (req, res) => {
  res.json({ message: 'Shopping mall API server' });
});

app.use('/api/health', healthRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', orderRouter);
app.use('/api/products', productRouter);
app.use('/api/users', userRouter);

app.use((req, res) => {
  res.status(404).json({ message: '요청한 API를 찾을 수 없습니다.' });
});

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status ?? 500;
  const shouldHideDetails = status >= 500 && app.get('env') === 'production' && !err.expose;

  res.status(status).json({
    message: shouldHideDetails
      ? '서버 내부 오류가 발생했습니다.'
      : err.message ?? '서버 내부 오류가 발생했습니다.',
  });
});

module.exports = app;
