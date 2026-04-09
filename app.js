const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');

dotenv.config();

const bookingRoutes = require('./routes/bookingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const blogRoutes = require('./routes/blogRoutes');
const distanceRoutes = require('./routes/distance');
const testimonialRoutes = require('./routes/testimonialRoutes');
const driverRoutes = require('./routes/driverRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();

const isAllowedOrigin = (origin = '') => {
  if (!origin) return true;
  if (origin === 'capacitor://localhost') return true;
  if (origin === 'https://itarsitaxi.in' || origin === 'https://www.itarsitaxi.in') return true;
  if (/^http:\/\/localhost(?::\d+)?$/.test(origin)) return true;
  if (/^http:\/\/127\.0\.0\.1(?::\d+)?$/.test(origin)) return true;
  if (/^http:\/\/192\.168\.\d+\.\d+(?::\d+)?$/.test(origin)) return true;
  if (/^http:\/\/10\.\d+\.\d+\.\d+(?::\d+)?$/.test(origin)) return true;
  if (/^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+(?::\d+)?$/.test(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.netlify\.app$/.test(origin)) return true;
  return false;
};

app.set('trust proxy', 1);

app.use(cookieParser());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use((req, res, next) => {
  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      req.body = JSON.parse(req.body);
    } catch (error) {
      // Leave body as-is when it is not valid JSON.
    }
  }
  next();
});

app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      console.log(`❌ CORS rejected for origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: false,
}));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (isAllowedOrigin(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/distance', distanceRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/payment', paymentRoutes);

app.get('/', (req, res) => {
  res.send('✅ ItarsiTaxi Backend is Live');
});

app.get('/api/ping', (req, res) => {
  res.status(200).send('pong');
});

module.exports = { app, isAllowedOrigin };
