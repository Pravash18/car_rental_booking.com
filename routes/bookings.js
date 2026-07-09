const express = require('express');
const { db } = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// POST /api/bookings - Create a new booking
router.post('/', authenticateToken, (req, res) => {
  const {
    car_id,
    pickup_date,
    return_date,
    pickup_location,
    return_location,
    notes
  } = req.body;

  if (!car_id || !pickup_date || !return_date || !pickup_location || !return_location) {
    return res.status(400).json({
      success: false,
      message: 'All booking fields are required.'
    });
  }

  const pickup = new Date(pickup_date);
  const returnD = new Date(return_date);

  if (pickup >= returnD) {
    return res.status(400).json({
      success: false,
      message: 'Return date must be after pickup date.'
    });
  }

  const total_days = Math.ceil((returnD - pickup) / (1000 * 60 * 60 * 24));

  // Check car availability and get price
  db.get(
    'SELECT id, name, price_per_day, available FROM cars WHERE id = ?',
    [car_id],
    (err, car) => {
      if (err || !car) {
        return res.status(404).json({ success: false, message: 'Car not found.' });
      }
      if (!car.available) {
        return res.status(409).json({ success: false, message: 'This car is not available.' });
      }

      // Check for overlapping bookings
      db.get(`
        SELECT id FROM bookings
        WHERE car_id = ? AND status NOT IN ('cancelled')
        AND NOT (return_date <= ? OR pickup_date >= ?)
      `, [car_id, pickup_date, return_date], (err, overlap) => {
        if (overlap) {
          return res.status(409).json({
            success: false,
            message: 'Car is already booked for the selected dates.'
          });
        }

        const total_price = total_days * car.price_per_day;

        db.run(`
          INSERT INTO bookings (user_id, car_id, pickup_date, return_date, pickup_location,
          return_location, total_days, total_price, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          req.user.id, car_id, pickup_date, return_date,
          pickup_location, return_location, total_days, total_price, notes || null
        ], function (err) {
          if (err) {
            return res.status(500).json({ success: false, message: 'Failed to create booking.' });
          }

          const bookingId = this.lastID;

          // Mark car as unavailable
          db.run('UPDATE cars SET available = 0 WHERE id = ?', [car_id]);

          res.status(201).json({
            success: true,
            message: `Booking confirmed! ${car.name} reserved for ${total_days} day(s).`,
            booking: {
              id: bookingId,
              car_name: car.name,
              pickup_date,
              return_date,
              total_days,
              total_price,
              pickup_location,
              return_location,
              status: 'pending'
            }
          });
        });
      });
    }
  );
});

// GET /api/bookings - Get user's bookings (or all for admin)
router.get('/', authenticateToken, (req, res) => {
  const isAdmin = req.user.role === 'admin';

  const query = isAdmin
    ? `SELECT b.*, c.name as car_name, c.brand, c.model, c.image_url, c.color,
              u.name as user_name, u.email as user_email
       FROM bookings b
       JOIN cars c ON b.car_id = c.id
       JOIN users u ON b.user_id = u.id
       ORDER BY b.created_at DESC`
    : `SELECT b.*, c.name as car_name, c.brand, c.model, c.image_url, c.color,
              c.price_per_day, c.fuel_type, c.transmission, c.seats
       FROM bookings b
       JOIN cars c ON b.car_id = c.id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`;

  const params = isAdmin ? [] : [req.user.id];

  db.all(query, params, (err, bookings) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to fetch bookings.' });
    }
    res.json({
      success: true,
      count: bookings.length,
      bookings
    });
  });
});

// GET /api/bookings/:id - Get single booking
router.get('/:id', authenticateToken, (req, res) => {
  db.get(`
    SELECT b.*, c.name as car_name, c.brand, c.model, c.image_url, c.color,
           c.price_per_day, c.fuel_type, c.transmission, c.seats,
           u.name as user_name, u.email as user_email
    FROM bookings b
    JOIN cars c ON b.car_id = c.id
    JOIN users u ON b.user_id = u.id
    WHERE b.id = ? AND (b.user_id = ? OR ? = 'admin')
  `, [req.params.id, req.user.id, req.user.role], (err, booking) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error.' });
    }
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }
    res.json({ success: true, booking });
  });
});

// PATCH /api/bookings/:id/cancel - Cancel a booking
router.patch('/:id/cancel', authenticateToken, (req, res) => {
  db.get(
    'SELECT id, car_id, user_id, status FROM bookings WHERE id = ?',
    [req.params.id],
    (err, booking) => {
      if (err || !booking) {
        return res.status(404).json({ success: false, message: 'Booking not found.' });
      }
      if (booking.user_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Not authorized.' });
      }
      if (booking.status === 'cancelled') {
        return res.status(400).json({ success: false, message: 'Booking already cancelled.' });
      }

      db.run(
        'UPDATE bookings SET status = "cancelled", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [booking.id],
        (err) => {
          if (err) {
            return res.status(500).json({ success: false, message: 'Failed to cancel booking.' });
          }
          // Make car available again
          db.run('UPDATE cars SET available = 1 WHERE id = ?', [booking.car_id]);

          res.json({ success: true, message: 'Booking cancelled successfully.' });
        }
      );
    }
  );
});

// PATCH /api/bookings/:id/status - Update booking status (admin only)
router.patch('/:id/status', authenticateToken, requireAdmin, (req, res) => {
  const { status, payment_status } = req.body;
  const validStatuses = ['pending', 'confirmed', 'active', 'completed', 'cancelled'];

  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status.' });
  }

  db.run(
    'UPDATE bookings SET status = COALESCE(?, status), payment_status = COALESCE(?, payment_status), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [status, payment_status, req.params.id],
    function (err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Failed to update booking.' });
      }
      res.json({ success: true, message: 'Booking updated successfully.' });
    }
  );
});

module.exports = router;
