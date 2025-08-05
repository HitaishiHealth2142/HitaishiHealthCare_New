const express = require('express');
const router = express.Router();
const db = require('../db');
const nodemailer = require('nodemailer');

// ✅ Ensure newpayment table exists (updated schema)
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS newpayment (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_id VARCHAR(10) UNIQUE,
    test_name VARCHAR(255),
    test_id VARCHAR(50),
    center_name VARCHAR(255),
    amount INT,
    payment_method VARCHAR(50),
    patient_name VARCHAR(255),
    patient_email VARCHAR(255),
    patient_mobile VARCHAR(20),
    test_date DATE,
    timestamp DATETIME
  )
`;
db.query(createTableQuery, (err) => {
  if (err) console.error("❌ Failed to create newpayment table:", err);
  else console.log("✅ newpayment table ready");
});

// ✅ Generate unique payment ID
function generatePaymentID() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  return Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join('') +
         Array.from({ length: 6 }, () => numbers[Math.floor(Math.random() * numbers.length)]).join('');
}

// ✅ Nodemailer setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'spltechnologycorp@gmail.com',
    pass: 'cbkm ntdm cuvp vygh' // 🔹 Should use process.env.GMAIL_PASS
  }
});

// ✅ POST /api/newpayment/register (updated endpoint and fields)
router.post('/newpayment/register', (req, res) => {
  const { 
    testName, 
    testId, 
    centerName, 
    amount, 
    paymentMethod, 
    patientName, 
    patientEmail, 
    patientMobile,
    testDate 
  } = req.body;

  // Validate required fields
  if (!testName || !amount || !paymentMethod || !patientName || !patientEmail || !patientMobile || !testDate) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Validate test date is not in the past
  const today = new Date();
  const maxDate = new Date();
  maxDate.setDate(today.getDate() + 30);
  const selectedDate = new Date(testDate);
  
  if (selectedDate < today || selectedDate > maxDate) {
    return res.status(400).json({ error: 'Test date must be within the next 30 days' });
  }

  const paymentID = generatePaymentID();
  const formattedTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const insertQuery = `
    INSERT INTO newpayment (
      payment_id, 
      test_name, 
      test_id, 
      center_name, 
      amount, 
      payment_method, 
      patient_name, 
      patient_email, 
      patient_mobile, 
      test_date, 
      timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(insertQuery, [
    paymentID, 
    testName, 
    testId, 
    centerName, 
    amount, 
    paymentMethod, 
    patientName, 
    patientEmail, 
    patientMobile, 
    testDate, 
    formattedTime
  ], (err) => {
    if (err) {
      console.error('❌ Insert Error:', err.sqlMessage || err);
      return res.status(500).json({ error: 'Database insert failed', details: err.sqlMessage });
    }

    // ✅ Send enhanced confirmation email
    const mailOptions = {
      from: 'spltechnologycorp@gmail.com',
      to: patientEmail,
      subject: 'Test Booking Confirmation - Hitaishi Healthcare',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0A0A57;">Booking Confirmed</h2>
          <p>Dear ${patientName},</p>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h3 style="margin-top: 0; color: #0A0A57;">Booking Details</h3>
            <p><strong>Test Name:</strong> ${testName}</p>
            <p><strong>Test ID:</strong> ${testId}</p>
            <p><strong>Center:</strong> ${centerName}</p>
            <p><strong>Test Date:</strong> ${new Date(testDate).toLocaleDateString()}</p>
            <p><strong>Payment ID:</strong> ${paymentID}</p>
            <p><strong>Amount:</strong> ₹${amount}</p>
            <p><strong>Payment Method:</strong> ${paymentMethod}</p>
          </div>
          
          <p style="margin-bottom: 0;">Thank you for choosing Hitaishi Healthcare.</p>
          <p>If you have any questions, please contact us at support@hitaishihealthcare.com</p>
          
          <div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
            <p>This is an automated message. Please do not reply directly to this email.</p>
          </div>
        </div>
      `
    };

    transporter.sendMail(mailOptions, (emailErr) => {
      if (emailErr) {
        console.error('❌ Email Error:', emailErr);
        // Don't fail booking if email fails
        return res.json({ 
          success: true, 
          paymentID, 
          email: 'failed',
          bookingDetails: {
            testName,
            testId,
            centerName,
            amount,
            testDate,
            patientName,
            patientMobile
          }
        });
      }

      res.json({ 
        success: true, 
        paymentID, 
        email: 'sent',
        bookingDetails: {
          testName,
          testId,
          centerName,
          amount,
          testDate,
          patientName,
          patientMobile
        }
      });
    });
  });
});

// ✅ GET /api/newpayment/get → fetch all (updated to include new fields)
router.get('/newpayment/get', (req, res) => {
  db.query('SELECT * FROM newpayment ORDER BY id DESC', (err, results) => {
    if (err) {
      console.error('❌ Fetch all error:', err);
      return res.status(500).json({ error: 'Failed to fetch bookings' });
    }
    res.json(results);
  });
});

// ✅ GET /api/newpayment/get/:id → fetch by ID (updated to include new fields)
router.get('/newpayment/get/:id', (req, res) => {
  const paymentID = req.params.id;
  db.query('SELECT * FROM newpayment WHERE payment_id = ?', [paymentID], (err, results) => {
    if (err) {
      console.error('❌ Fetch by ID error:', err);
      return res.status(500).json({ error: 'Failed to fetch booking' });
    }
    if (results.length === 0) return res.status(404).json({ error: 'Booking not found' });
    res.json(results[0]);
  });
});

module.exports = router;