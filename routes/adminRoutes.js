const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const Booking = require('../models/Booking');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'No token provided' });

  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.admin = decoded;
    next();
  });
};

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const token = jwt.sign(
      { username, loginTime: Date.now() },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1d' }
    );

    return res.json({ success: true, token });
  }

  res.status(401).json({ success: false, message: 'Invalid credentials' });
});

router.get('/debug-env', (req, res) => {
  res.json({
    adminUsername: process.env.ADMIN_USERNAME || null,
    hasAdminPassword: Boolean(process.env.ADMIN_PASSWORD),
    hasJwtSecret: Boolean(process.env.JWT_SECRET),
  });
});

router.get('/bookings', verifyToken, async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });

    const summary = {
      total: bookings.length,
      today: bookings.filter(
        (b) => new Date(b.createdAt).toDateString() === new Date().toDateString()
      ).length,
      revenue: bookings.reduce((acc, b) => acc + (b.totalFare || 0), 0),
      byCarType: [],
    };

    const carTypeMap = {};
    bookings.forEach((b) => {
      if (b.carType) {
        carTypeMap[b.carType] = (carTypeMap[b.carType] || 0) + 1;
      }
    });

    summary.byCarType = Object.keys(carTypeMap).map((type) => ({
      type,
      count: carTypeMap[type],
    }));

    res.json({ bookings, summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch bookings' });
  }
});

router.put('/bookings/:id/payment', verifyToken, async (req, res) => {
  try {
    const { paymentStatus, paymentNotes = '' } = req.body;

    if (!['Paid', 'Failed', 'pending_verification'].includes(paymentStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid payment status' });
    }

    const update = {
      paymentStatus,
      paymentNotes,
      verifiedBy: req.admin?.username || 'admin',
      verifiedAt: new Date(),
    };

    const booking = await Booking.findByIdAndUpdate(req.params.id, update, { new: true });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.json({ success: true, booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update payment status' });
  }
});

router.put('/bookings/:id/complete', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: 'completed' },
      { new: true }
    );
    if (!booking) return res.status(404).json({ success: false });
    res.json({ success: true, booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

router.delete('/bookings/:id', verifyToken, async (req, res) => {
  try {
    const deleted = await Booking.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
