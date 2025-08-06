const express = require('express');
const router = express.Router();
const db = require('../db');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// TABLE SETUP
const createTable = `
CREATE TABLE IF NOT EXISTS diagnostic_centers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  center_id VARCHAR(6) UNIQUE,
  center_name VARCHAR(255),
  owner_name VARCHAR(255),
  center_type VARCHAR(100),
  phone VARCHAR(20),
  alt_phone VARCHAR(20),
  email VARCHAR(255) UNIQUE NOT NULL,
  whatsapp VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  map_url TEXT,
  registration_number VARCHAR(100),
  gst_number VARCHAR(50),
  services TEXT,
  home_sample ENUM('Yes','No'),
  operational_hours TEXT,
  account_holder_name VARCHAR(255),
  bank_name VARCHAR(255),
  account_number VARCHAR(50),
  ifsc_code VARCHAR(20),
  upi_id VARCHAR(255),
  pan_aadhar_jpeg TEXT,
  license_copy_jpeg TEXT,
  upi_qr_code_jpeg TEXT,
  password VARCHAR(255),
  is_verified TINYINT DEFAULT 0,
  otp_code VARCHAR(6),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`;
db.query(createTable, (err) => {
  if (err) console.error('❌ Table error:', err);
  else console.log('✅ diagnostic_centers table ready');
});

// EMAIL SETUP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'spltechnologycorp@gmail.com',
    pass: 'cbkm ntdm cuvp vygh' // App password
  }
});

async function sendEmail(to, subject, html) {
  try {
    await transporter.sendMail({ from: 'spltechnologycorp@gmail.com', to, subject, html });
    console.log('✅ OTP Email sent');
  } catch (err) {
    console.error('❌ Email error:', err);
  }
}

// CHECK EMAIL ALREADY EXISTS
router.post('/diagnostics/check-email', (req, res) => {
  const { email } = req.body;
  db.query("SELECT * FROM diagnostic_centers WHERE email = ?", [email], (err, result) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (result.length > 0 && result[0].is_verified === 1) {
      return res.json({ exists: true, message: 'Email already registered.' });
    }
    res.json({ exists: false });
  });
});

// SEND OTP
router.post('/diagnostics/send-otp', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const sql = `
    INSERT INTO diagnostic_centers (email, otp_code, is_verified)
    VALUES (?, ?, 0)
    ON DUPLICATE KEY UPDATE otp_code = ?, is_verified = IF(is_verified = 1, 1, 0)
  `;
  db.query(sql, [email, otp, otp], (err) => {
    if (err) return res.status(500).json({ error: 'DB error during OTP gen' });

    const html = `<p>Your OTP is: <strong>${otp}</strong>. Valid for 10 minutes.</p>`;
    sendEmail(email, 'Hitaishi OTP Verification', html);
    res.json({ success: true, message: 'OTP sent successfully.' });
  });
});

// VERIFY OTP
router.post('/diagnostics/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  db.query("SELECT * FROM diagnostic_centers WHERE email = ? AND otp_code = ?", [email, otp], (err, result) => {
    if (err) return res.status(500).json({ error: 'DB error verifying OTP' });
    if (result.length > 0) {
      db.query("UPDATE diagnostic_centers SET is_verified = 1, otp_code = NULL WHERE email = ?", [email], (err) => {
        if (err) return res.status(500).json({ error: 'Error updating verification' });
        return res.json({ success: true, message: 'OTP verified successfully!' });
      });
    } else {
      res.status(400).json({ error: 'Invalid OTP' });
    }
  });
});

// ✅ REGISTER ROUTE
router.post('/diagnostics/register', (req, res) => {
  const {
    email, centerName, ownerName, centerType, phone, altPhone, whatsapp,
    address, city, state, pincode, mapUrl, registrationNumber, gstNumber,
    accountHolderName, bankName, accountNumber, ifscCode, upiId,
    fromTime, toTime, services, homeSample, password
  } = req.body;

  if (!email || !centerName || !password) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const operational_hours = `${fromTime} - ${toTime}`;
  const center_id = crypto.randomBytes(3).toString('hex').toUpperCase();
  const sql = `
    UPDATE diagnostic_centers SET 
      center_id=?, center_name=?, owner_name=?, center_type=?,
      phone=?, alt_phone=?, whatsapp=?, address=?, city=?, state=?, pincode=?, map_url=?,
      registration_number=?, gst_number=?, services=?, home_sample=?, operational_hours=?,
      account_holder_name=?, bank_name=?, account_number=?, ifsc_code=?, upi_id=?, password=?
    WHERE email=? AND is_verified=1
  `;
  const values = [
    center_id, centerName, ownerName, centerType,
    phone, altPhone, whatsapp, address, city, state, pincode, mapUrl,
    registrationNumber, gstNumber, JSON.stringify(services), homeSample, operational_hours,
    accountHolderName, bankName, accountNumber, ifscCode, upiId, password, email
  ];

  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json({ error: 'DB error during registration' });
    if (result.affectedRows === 0) {
      return res.status(400).json({ error: 'Please verify email before registration.' });
    }
    res.json({ success: true, message: 'Registration successful!' });
  });
});


// ✅ Login Route
router.post('/diagnostics/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const query = "SELECT * FROM diagnostic_centers WHERE email = ? AND password = ? AND is_verified = 1";
    db.query(query, [email, password], (err, result) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (result.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        res.json({
          success: true,
          message: 'Login successful',
          user: { id: result[0].id, center_id: result[0].center_id, center_name: result[0].center_name }
        });
    });
});

// ✅ Forgot Password - Step 1: Send OTP
router.post('/diagnostics/forgot-password/send-otp', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const checkQuery = "SELECT * FROM diagnostic_centers WHERE email = ?";
    db.query(checkQuery, [email], (err, result) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (result.length === 0) return res.status(400).json({ error: 'Email not found' });

        const updateOtpQuery = "UPDATE diagnostic_centers SET otp_code = ? WHERE email = ?";
        db.query(updateOtpQuery, [otp, email], (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });

            const mailHtml = `
                <div style="font-family: Arial, sans-serif; text-align: center;">
                    <h2>Password Reset OTP</h2>
                    <p>Your OTP for password reset is:</p>
                    <div style="font-size: 22px; font-weight: bold; padding: 10px; background: #eee;">${otp}</div>
                </div>`;
            sendEmail(email, 'Hitaishi Healthcare: Password Reset OTP', mailHtml);

            res.json({ success: true, message: 'OTP sent to your email.' });
        });
    });
});

// ✅ Forgot Password - Step 2: Verify OTP
router.post('/diagnostics/forgot-password/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

    const verifyQuery = "SELECT * FROM diagnostic_centers WHERE email = ? AND otp_code = ?";
    db.query(verifyQuery, [email, otp], (err, result) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (result.length === 0) return res.status(400).json({ error: 'Invalid OTP' });

        res.json({ success: true, message: 'OTP verified. You may now reset your password.' });
    });
});

// ✅ Forgot Password - Step 3: Reset Password
router.post('/diagnostics/forgot-password/reset', (req, res) => {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) return res.status(400).json({ error: 'Email and new password required' });

    const updateQuery = "UPDATE diagnostic_centers SET password = ?, otp_code = NULL WHERE email = ?";
    db.query(updateQuery, [newPassword, email], (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true, message: 'Password reset successful' });
    });
});

// ✅ Get All Diagnostic Centers
router.get('/diagnostics/all', (req, res) => {
    db.query("SELECT * FROM diagnostic_centers", (err, result) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true, users: result });
    });
});

// ✅ Get User by ID
router.get('/diagnostics/:id', (req, res) => {
    const { id } = req.params;
    db.query("SELECT * FROM diagnostic_centers WHERE id = ?", [id], (err, result) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (result.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ success: true, user: result[0] });
    });
});

// ✅ Update User Profile by ID
router.put('/diagnostics/:id', (req, res) => {
    const { id } = req.params;
    const updatedData = req.body;
    const fields = Object.keys(updatedData).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updatedData);

    const updateQuery = `UPDATE diagnostic_centers SET ${fields} WHERE id = ?`;
    db.query(updateQuery, [...values, id], (err, result) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true, message: 'User updated successfully' });
    });
});

// ✅ Delete User by ID
router.delete('/diagnostics/:id', (req, res) => {
    const { id } = req.params;
    db.query("DELETE FROM diagnostic_centers WHERE id = ?", [id], (err, result) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ success: true, message: 'User deleted successfully' });
    });
});


module.exports = router;
