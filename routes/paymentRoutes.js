const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
require('dotenv').config();

router.post('/upi/initiate', async (req, res) => {
  try {
    const { amount, bookingData } = req.body;

    if (!amount || !bookingData) {
      return res.status(400).json({ success: false, message: 'Amount and bookingData are required.' });
    }

    const newBooking = new Booking({
      ...bookingData,
      advanceAmount: amount,
      paymentMode: 'UPI',
      paymentStatus: 'initiated',
      merchantOrderId: `UPI-${Date.now()}`,
      status: 'pending',
    });

    const savedBooking = await newBooking.save();

    return res.status(201).json({
      success: true,
      bookingId: savedBooking._id,
      amount: savedBooking.advanceAmount,
    });
  } catch (err) {
    console.error('UPI initiate error:', err);
    return res.status(500).json({ success: false, message: 'Failed to start UPI booking.' });
  }
});

router.post('/upi/submit-proof', async (req, res) => {
  try {
    const { bookingId, utr } = req.body;

    if (!bookingId || !utr) {
      return res.status(400).json({ success: false, message: 'bookingId and utr are required.' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    booking.utr = utr.trim();
    booking.transactionId = utr.trim();
    booking.paymentStatus = 'pending_verification';

    await booking.save();

    return res.json({ success: true, message: 'Payment proof submitted.' });
  } catch (err) {
    console.error('UPI proof error:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit UPI proof.' });
  }
});

module.exports = router;
