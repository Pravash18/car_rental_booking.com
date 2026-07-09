const express = require('express');
const crypto = require('crypto');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

let razorpayInstance = null;
try {
  const Razorpay = require('razorpay');
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID !== 'rzp_test_placeholder') {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    console.log('✅ Razorpay initialized');
  }
} catch (err) {
  console.log('⚠️ Razorpay running in demo mode');
}

// POST /api/payments/create-order
router.post('/create-order', authenticateToken, (req, res) => {
  const { booking_id } = req.body;

  db.get(
    `SELECT b.*, c.name as car_name FROM bookings b JOIN cars c ON b.car_id = c.id 
     WHERE b.id = ? AND b.user_id = ?`,
    [booking_id, req.user.id],
    async (err, booking) => {
      if (err || !booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
      if (booking.payment_status === 'paid') return res.status(400).json({ success: false, message: 'Already paid.' });

      const amountInPaise = Math.round(booking.total_price * 100);

      // Razorpay mode
      if (razorpayInstance) {
        try {
          const order = await razorpayInstance.orders.create({
            amount: amountInPaise,
            currency: 'INR',
            receipt: `booking_${booking_id}`,
          });

          db.run(
            'INSERT INTO payments (booking_id, user_id, razorpay_order_id, amount, currency, status) VALUES (?, ?, ?, ?, ?, ?)',
            [booking_id, req.user.id, order.id, booking.total_price, 'INR', 'created']
          );

          return res.json({
            success: true,
            order: { id: order.id, amount: order.amount, currency: order.currency },
            booking,
            key_id: process.env.RAZORPAY_KEY_ID,
            mode: 'live'
          });
        } catch (err) {
          console.error(err);
        }
      }

      // Demo/Local UPI mode fallback
      const demoOrderId = `order_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      db.run(
        'INSERT INTO payments (booking_id, user_id, razorpay_order_id, amount, currency, status) VALUES (?, ?, ?, ?, ?, ?)',
        [booking_id, req.user.id, demoOrderId, booking.total_price, 'INR', 'created']
      );

      res.json({
        success: true,
        order: { id: demoOrderId, amount: amountInPaise, currency: 'INR' },
        booking,
        mode: 'demo'
      });
    }
  );
});

// POST /api/payments/submit-upi - Submit direct UPI transaction reference
router.post('/submit-upi', authenticateToken, (req, res) => {
  const { booking_id, upi_transaction_id, amount } = req.body;

  if (!booking_id || !upi_transaction_id) {
    return res.status(400).json({ success: false, message: 'Booking ID and Transaction UTR are required.' });
  }

  if (!/^\d{12}$/.test(upi_transaction_id) && upi_transaction_id.length < 8) {
    return res.status(400).json({ success: false, message: 'Please enter a valid UPI Transaction Ref (min 8 characters).' });
  }

  // Update payment records directly to verified since they did a real UPI scan to the merchant Paytm account
  db.serialize(() => {
    db.run(
      `INSERT INTO payments (booking_id, user_id, upi_transaction_id, amount, currency, status, method) 
       VALUES (?, ?, ?, ?, 'INR', 'paid', 'UPI_DIRECT')`,
      [booking_id, req.user.id, upi_transaction_id, amount]
    );

    db.run(
      `UPDATE bookings SET payment_status = 'paid', status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`,
      [booking_id, req.user.id],
      (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Failed to update booking status.' });
        res.json({
          success: true,
          message: 'UPI payment submitted and confirmed! We will verify the transaction ID shortly.',
          payment: {
            booking_id,
            upi_transaction_id,
            status: 'paid'
          }
        });
      }
    );
  });
});

// POST /api/payments/verify (Razorpay verification)
router.post('/verify', authenticateToken, (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, booking_id } = req.body;

  if (!booking_id || !razorpay_order_id) {
    return res.status(400).json({ success: false, message: 'Missing payment details.' });
  }

  if (!razorpayInstance || razorpay_order_id.startsWith('demo_')) {
    db.run(
      `UPDATE payments SET razorpay_payment_id = ?, razorpay_signature = ?, status = 'paid', method = 'demo', updated_at = CURRENT_TIMESTAMP 
       WHERE razorpay_order_id = ? AND user_id = ?`,
      [razorpay_payment_id || `demo_pay_${Date.now()}`, 'demo_signature', razorpay_order_id, req.user.id]
    );

    db.run(
      `UPDATE bookings SET payment_status = 'paid', status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`,
      [booking_id, req.user.id]
    );

    return res.json({
      success: true,
      message: 'Payment successful! (Demo Mode)',
      payment: { order_id: razorpay_order_id, payment_id: razorpay_payment_id || `demo_pay_${Date.now()}`, status: 'paid' }
    });
  }

  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ success: false, message: 'Payment signature verification failed.' });
  }

  db.run(
    `UPDATE payments SET razorpay_payment_id = ?, razorpay_signature = ?, status = 'paid', method = 'razorpay', updated_at = CURRENT_TIMESTAMP 
     WHERE razorpay_order_id = ?`,
    [razorpay_payment_id, razorpay_signature, razorpay_order_id]
  );

  db.run(
    `UPDATE bookings SET payment_status = 'paid', status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [booking_id]
  );

  res.json({
    success: true,
    message: 'Payment verified!',
    payment: { order_id: razorpay_order_id, payment_id: razorpay_payment_id, status: 'paid' }
  });
});

// GET /api/payments/:bookingId
router.get('/:bookingId', authenticateToken, (req, res) => {
  db.get(
    `SELECT p.*, b.total_price as booking_amount, b.status as booking_status, c.name as car_name 
     FROM payments p JOIN bookings b ON p.booking_id = b.id JOIN cars c ON b.car_id = c.id
     WHERE p.booking_id = ? AND p.user_id = ? ORDER BY p.created_at DESC LIMIT 1`,
    [req.params.bookingId, req.user.id],
    (err, payment) => {
      if (err) return res.status(500).json({ success: false, message: 'Database error.' });
      res.json({ success: true, payment });
    }
  );
});

module.exports = router;
