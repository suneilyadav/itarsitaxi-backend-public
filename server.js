const dotenv = require('dotenv');
const { app } = require('./app');
const { connectDb } = require('./db');

dotenv.config();
const PORT = process.env.PORT || 5000;

connectDb()
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB error:', err.message);
    process.exit(1);
  });
