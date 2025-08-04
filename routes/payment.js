const express = require('express');
const router = express.Router();
const db = require('../db'); // assuming db.js exports a configured MySQL connection
const nodemailer = require('nodemailer');

// 🔹 Create payments table if not exists
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_id VARCHAR(10) UNIQUE,
    test_name VARCHAR(255),
    amount INT,
    payment_method VARCHAR(50),
    patient_name VARCHAR(255),
    patient_email VARCHAR(255),
    patient_mobile VARCHAR(20),
    timestamp DATETIME
  )
`;
db.query(createTableQuery, (err) => {
  if (err) console.error("Failed to create payments table:", err);
  else console.log("✅ Payments table ready");
});

// 🔹 Generate unique payment ID: 4 letters + 6 digits
function generatePaymentID() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  let alpha = '';
  let numeric = '';
  for (let i = 0; i < 4; i++) alpha += letters.charAt(Math.floor(Math.random() * letters.length));
  for (let i = 0; i < 6; i++) numeric += numbers.charAt(Math.floor(Math.random() * numbers.length));
  return alpha + numeric;
}

// 🔹 Configure nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'spltechnologycorp@gmail.com',        // ✅ Update this
    pass: 'cbkm ntdm cuvp vygh'           // ✅ Use Gmail App Password
  }
});

// 🔹 POST /api/payments
router.post('/payment/register', (req, res) => {
  const {
    testName,
    amount,
    paymentMethod,
    patientName,
    patientEmail,
    patientMobile,
    timestamp
  } = req.body;

  if (!testName || !amount || !paymentMethod || !patientName || !patientEmail || !patientMobile) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const paymentID = generatePaymentID();
  const insertQuery = `
    INSERT INTO payments (payment_id, test_name, amount, payment_method, patient_name, patient_email, patient_mobile, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(insertQuery, [paymentID, testName, amount, paymentMethod, patientName, patientEmail, patientMobile, timestamp], (err, result) => {
    if (err) {
      console.error('Insert Error:', err);
      return res.status(500).json({ error: 'Database insert failed' });
    }

    // ✉️ Send confirmation email
    const mailOptions = {
      from: 'spltechnologycorp@gmail.com',
      to: patientEmail,
      subject: 'Booking Confirmation - Hitaishi Healthcare',
      html: `
        <h3>Booking Confirmed</h3>
        <p>Dear ${patientName},</p>
        <p>Your booking for the <strong>${testName}</strong> test is confirmed.</p>
        <p><strong>Payment ID:</strong> ${paymentID}</p>
        <p><strong>Amount:</strong> ₹${amount}</p>
        <p><strong>Method:</strong> ${paymentMethod}</p>
        <p>Thank you for choosing Hitaishi Healthcare.</p>
      `
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error('Email Error:', err);
        return res.status(500).json({ error: 'Email sending failed' });
      }

      return res.json({ success: true, paymentID });
    });
  });
});

// 🔹 GET /api/payments → fetch all
router.get('/payments/get', (req, res) => {
  db.query('SELECT * FROM payments ORDER BY id DESC', (err, results) => {
    if (err) {
      console.error('Fetch all error:', err);
      return res.status(500).json({ error: 'Failed to fetch payments' });
    }
    res.json(results);
  });
});

// 🔹 GET /api/payments/:id → fetch by payment ID
router.get('/payments/get:id', (req, res) => {
  const paymentID = req.params.id;
  db.query('SELECT * FROM payments WHERE payment_id = ?', [paymentID], (err, results) => {
    if (err) {
      console.error('Fetch by ID error:', err);
      return res.status(500).json({ error: 'Failed to fetch payment' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(results[0]);
  });
});

module.exports = router;
