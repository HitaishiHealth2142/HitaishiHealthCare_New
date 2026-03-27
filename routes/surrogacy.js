const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../db');

// =====================
// FILE UPLOAD (PDF ONLY)
// =====================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/medical_reports/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF allowed'), false);
  }
});

// =====================
// CREATE TABLES
// =====================
const createTables = () => {
  db.query(`
    CREATE TABLE IF NOT EXISTS parents_surrogacy (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(255),
      email VARCHAR(255),
      phone VARCHAR(50),
      country VARCHAR(100),
      marital_status VARCHAR(50),
      surrogacy_type VARCHAR(100),
      medical_condition TEXT,
      budget VARCHAR(100),
      medical_report VARCHAR(255),
      status ENUM('pending','approved','rejected') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.query(`
    CREATE TABLE IF NOT EXISTS surrogates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(255),
      age INT,
      email VARCHAR(255),
      phone VARCHAR(50),
      country VARCHAR(100),
      health_condition TEXT,
      previous_pregnancy VARCHAR(10),
      children_count INT,
      lifestyle TEXT,
      medical_report VARCHAR(255),
      status ENUM('pending','approved','rejected') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

createTables();

// =====================
// PARENT REGISTER
// =====================
router.post('/parents/register', upload.single('medical_report'), (req, res) => {
  const data = req.body;
  const file = req.file ? req.file.filename : null;

  const sql = `
    INSERT INTO parents_surrogacy 
    (full_name,email,phone,country,marital_status,surrogacy_type,medical_condition,budget,medical_report)
    VALUES (?,?,?,?,?,?,?,?,?)
  `;

  db.query(sql, [
    data.full_name,
    data.email,
    data.phone,
    data.country,
    data.marital_status,
    data.surrogacy_type,
    data.medical_condition,
    data.budget,
    file
  ], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Parent registered successfully" });
  });
});

// =====================
// SURROGATE REGISTER
// =====================
router.post('/surrogate/register', upload.single('medical_report'), (req, res) => {
  const data = req.body;
  const file = req.file ? req.file.filename : null;

  const sql = `
    INSERT INTO surrogates 
    (full_name,age,email,phone,country,health_condition,previous_pregnancy,children_count,lifestyle,medical_report)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `;

  db.query(sql, [
    data.full_name,
    data.age,
    data.email,
    data.phone,
    data.country,
    data.health_condition,
    data.previous_pregnancy,
    data.children_count,
    data.lifestyle,
    file
  ], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Surrogate registered successfully" });
  });
});

// =====================
// ADMIN GET DATA
// =====================
router.get('/admin/parents', (req, res) => {
  db.query("SELECT * FROM parents_surrogacy ORDER BY created_at DESC", (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

router.get('/admin/surrogates', (req, res) => {
  db.query("SELECT * FROM surrogates ORDER BY created_at DESC", (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

// =====================
// APPROVE / REJECT
// =====================
router.put('/admin/parents/:id/status', (req, res) => {
  const { status } = req.body;
  db.query("UPDATE parents_surrogacy SET status=? WHERE id=?", [status, req.params.id], () => {
    res.json({ message: "Updated" });
  });
});

router.put('/admin/surrogates/:id/status', (req, res) => {
  const { status } = req.body;
  db.query("UPDATE surrogates SET status=? WHERE id=?", [status, req.params.id], () => {
    res.json({ message: "Updated" });
  });
});

module.exports = router;