const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// ✅ Create diagnostic_tests table if it doesn't exist
const createTableQuery = `
CREATE TABLE IF NOT EXISTS diagnostic_tests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  test_id VARCHAR(6) UNIQUE,
  test_name VARCHAR(255),
  test_code VARCHAR(50),
  category VARCHAR(100),
  sample_required VARCHAR(100),
  description TEXT,
  pre_test_instructions TEXT,
  test_duration VARCHAR(100),
  report_time VARCHAR(100),
  price DECIMAL(10,2),
  discount DECIMAL(5,2),
  final_price DECIMAL(10,2),
  available_from DATE,
  diagnostic_id INT,
  center_name VARCHAR(255),
  status VARCHAR(50),
  tags TEXT,
  home_collection VARCHAR(10),
  test_image VARCHAR(255),
  map_url TEXT,  -- ✅ NEW FIELD
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

db.query(createTableQuery, (err) => {
  if (err) {
    console.error('❌ Error creating diagnostic_tests table:', err.message);
  } else {
    console.log('✅ diagnostic_tests table is ready.');
  }
});

// ✅ Multer setup for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'tests');
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'test-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage });

// ✅ Generate 6-char alphanumeric test ID
function generateTestId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// ✅ Register new test route
router.post('/test/register', upload.single('test_image'), async (req, res) => {
  try {
    const {
      test_name,
      test_code,
      category,
      sample_required,
      description,
      pre_test_instructions,
      test_duration,
      report_time,
      price,
      discount,
      final_price,
      available_from,
      diagnostic_id,
      status,
      tags,
      home_collection
    } = req.body;

    if (!diagnostic_id || !test_name || !price || !category) {
      return res.status(400).json({ success: false, error: 'Missing required fields.' });
    }

    // 🔍 Get center name from diagnostic_id
    const [centerResult] = await db.promise().query(
      'SELECT center_name FROM diagnostic_centers WHERE id = ?',
      [diagnostic_id]
    );

    if (!centerResult.length) {
      return res.status(404).json({ success: false, error: 'Diagnostic center not found.' });
    }

    const center_name = centerResult[0].center_name;

    // ✅ Generate Google Maps URL
    const encodedCenterName = encodeURIComponent(center_name);
    const map_url = `https://www.google.com/maps/search/?api=1&query=${encodedCenterName}`;

    const test_id = generateTestId();
    const test_image = req.file ? `/uploads/tests/${req.file.filename}` : null;

    const insertQuery = `
      INSERT INTO diagnostic_tests (
        test_id, test_name, test_code, category, sample_required, description,
        pre_test_instructions, test_duration, report_time, price, discount,
        final_price, available_from, diagnostic_id, center_name, status,
        tags, home_collection, test_image, map_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      test_id, test_name, test_code || null, category, sample_required, description,
      pre_test_instructions, test_duration, report_time, price, discount,
      final_price, available_from, diagnostic_id, center_name, status,
      tags, home_collection, test_image, map_url
    ];

    await db.promise().query(insertQuery, values);

    res.json({ success: true, test_id });
  } catch (error) {
    console.error('Error registering test:', error);
    res.status(500).json({ success: false, error: 'Server error.' });
  }
});

// GET all tests
router.get('/test/all', async (req, res) => {
  try {
    const [rows] = await db.promise().query('SELECT * FROM diagnostic_tests');
    res.json({ success: true, tests: rows });
  } catch (error) {
    console.error('Error fetching all tests:', error);
    res.status(500).json({ success: false, error: 'Server error.' });
  }
});

// GET tests by diagnostic_id
router.get('/test/center/:diagnostic_id', async (req, res) => {
  const { diagnostic_id } = req.params;
  try {
    const [rows] = await db.promise().query(
      'SELECT * FROM diagnostic_tests WHERE diagnostic_id = ?',
      [diagnostic_id]
    );

    res.json({ success: true, tests: rows });
  } catch (error) {
    console.error('Error fetching tests for center:', error);
    res.status(500).json({ success: false, error: 'Server error.' });
  }
});

// GET a single test by test_id
router.get('/test/:test_id', async (req, res) => {
  const { test_id } = req.params;
  try {
    const [rows] = await db.promise().query(
      'SELECT * FROM diagnostic_tests WHERE test_id = ?',
      [test_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Test not found.' });
    }

    res.json({ success: true, test: rows[0] });
  } catch (error) {
    console.error('Error fetching test by ID:', error);
    res.status(500).json({ success: false, error: 'Server error.' });
  }
});


module.exports = router;
