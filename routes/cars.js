const express = require('express');
const { db } = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/cars - Get all available cars with filters
router.get('/', (req, res) => {
  const { category, min_price, max_price, fuel_type, transmission, search, available } = req.query;

  let query = 'SELECT * FROM cars WHERE 1=1';
  const params = [];

  if (available !== 'all') {
    query += ' AND available = 1';
  }
  if (category && category !== 'all') {
    query += ' AND category = ?';
    params.push(category);
  }
  if (fuel_type && fuel_type !== 'all') {
    query += ' AND fuel_type = ?';
    params.push(fuel_type);
  }
  if (transmission && transmission !== 'all') {
    query += ' AND transmission = ?';
    params.push(transmission);
  }
  if (min_price) {
    query += ' AND price_per_day >= ?';
    params.push(parseFloat(min_price));
  }
  if (max_price) {
    query += ' AND price_per_day <= ?';
    params.push(parseFloat(max_price));
  }
  if (search) {
    query += ' AND (name LIKE ? OR brand LIKE ? OR model LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  query += ' ORDER BY rating DESC, price_per_day ASC';

  db.all(query, params, (err, cars) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to fetch cars.' });
    }

    // Parse features JSON string
    const carsWithFeatures = cars.map(car => ({
      ...car,
      features: car.features ? JSON.parse(car.features) : [],
      available: car.available === 1
    }));

    res.json({
      success: true,
      count: carsWithFeatures.length,
      cars: carsWithFeatures
    });
  });
});

// GET /api/cars/:id - Get single car
router.get('/:id', (req, res) => {
  db.get('SELECT * FROM cars WHERE id = ?', [req.params.id], (err, car) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error.' });
    }
    if (!car) {
      return res.status(404).json({ success: false, message: 'Car not found.' });
    }

    res.json({
      success: true,
      car: {
        ...car,
        features: car.features ? JSON.parse(car.features) : [],
        available: car.available === 1
      }
    });
  });
});

// POST /api/cars - Add new car (any authenticated user can upload)
router.post('/', authenticateToken, (req, res) => {
  const {
    name, brand, model, year, category, price_per_day, seats,
    transmission, fuel_type, color, image_url, description,
    features, horsepower, mileage
  } = req.body;

  if (!name || !brand || !model || !year || !category || !price_per_day) {
    return res.status(400).json({
      success: false,
      message: 'Required fields: name, brand, model, year, category, price_per_day'
    });
  }

  db.run(`
    INSERT INTO cars (name, brand, model, year, category, price_per_day, seats, 
    transmission, fuel_type, color, image_url, description, features, horsepower, mileage)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    name, brand, model, year, category, price_per_day, seats || 4,
    transmission || 'Automatic', fuel_type || 'Petrol', color || 'Black',
    image_url || null, description || null,
    features ? JSON.stringify(features) : null, horsepower || 0, mileage || 0
  ], function (err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to add car.' });
    }
    res.status(201).json({
      success: true,
      message: 'Car added successfully.',
      carId: this.lastID
    });
  });
});

// PUT /api/cars/:id - Update car (admin only)
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  const { available, price_per_day, description } = req.body;

  db.run(
    'UPDATE cars SET available = ?, price_per_day = ?, description = ? WHERE id = ?',
    [available ? 1 : 0, price_per_day, description, req.params.id],
    function (err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Failed to update car.' });
      }
      res.json({ success: true, message: 'Car updated successfully.' });
    }
  );
});

// DELETE /api/cars/:id - Delete car (admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  db.run('DELETE FROM cars WHERE id = ?', [req.params.id], function (err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to delete car.' });
    }
    res.json({ success: true, message: 'Car deleted successfully.' });
  });
});

// GET /api/cars/categories/list - Get unique categories
router.get('/meta/categories', (req, res) => {
  db.all('SELECT DISTINCT category FROM cars ORDER BY category', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error.' });
    }
    res.json({ success: true, categories: rows.map(r => r.category) });
  });
});

module.exports = router;
