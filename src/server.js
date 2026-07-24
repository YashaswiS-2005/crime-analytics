import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import config from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { authenticate, optionalAuthenticate } from './middleware/auth.js';
import errorHandler, { notFound } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import crimeRoutes from './routes/crimeRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import legacyRoutes from './routes/legacyRoutes.js';
import mlRoutes from './routes/mlRoutes.js';
import { predict } from './controllers/mlController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
      },
    },
  })
);
app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(
  rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: config.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

function requirePageAuth(req, res, next) {
  optionalAuthenticate(req, res, () => {
    if (req.user) return next();
    return res.redirect('/login.html');
  });
}

app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
app.get('/login.html', optionalAuthenticate, (req, res) => {
  if (req.user) return res.redirect('/');
  return res.sendFile(path.join(projectRoot, 'login.html'));
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/crimes', authenticate, crimeRoutes);
app.use('/api/analytics', authenticate, analyticsRoutes);
app.use('/api/ml', authenticate, mlRoutes);
app.post('/api/predict', authenticate, predict);
app.use('/api', authenticate, legacyRoutes);

app.get('/', requirePageAuth, (req, res) => res.sendFile(path.join(projectRoot, 'index.html')));
app.get('/index.html', requirePageAuth, (req, res) => res.redirect('/'));
app.get('/app.js', requirePageAuth, (req, res) => res.sendFile(path.join(projectRoot, 'app.js')));
app.get('/styles.css', requirePageAuth, (req, res) => res.sendFile(path.join(projectRoot, 'styles.css')));
app.get('/crime-pdf.pdf', requirePageAuth, (req, res) => res.sendFile(path.join(projectRoot, 'crime-pdf.pdf')));
app.use('/vendor/papaparse', requirePageAuth, express.static(path.join(projectRoot, 'node_modules', 'papaparse')));
app.use('/node_modules/xlsx', requirePageAuth, express.static(path.join(projectRoot, 'node_modules', 'xlsx')));

app.use(notFound);
app.use(errorHandler);

export { app };

export async function start() {
  await connectDatabase();
  const server = app.listen(config.PORT, () => {
    console.log(`Crime Analytics server running on http://localhost:${config.PORT}`);
  });

  const shutdown = async (signal) => {
    console.log(`${signal} received. Shutting down Crime Analytics server.`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  return server;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  start().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
