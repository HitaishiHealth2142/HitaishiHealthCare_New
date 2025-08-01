const express = require('express');
const router = express.Router();
const db = require('../db');  // ✅ Using your existing db.js connection
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// ✅ Create table if not exists
const createTableQuery = `
CREATE TABLE IF NOT EXISTS diagnostic_centers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    center_id VARCHAR(6) UNIQUE NOT NULL,
    center_name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    center_type VARCHAR(100),
    phone VARCHAR(20) NOT NULL,
    alt_phone VARCHAR(20),
    email VARCHAR(255) UNIQUE NOT NULL,
    whatsapp VARCHAR(20),
    address TEXT NOT NULL,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    map_url TEXT,
    registration_number VARCHAR(100),
    gst_number VARCHAR(50),
    services TEXT,
    home_sample ENUM('Yes','No'),
    operational_hours VARCHAR(255),
    bank_details TEXT,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    is_verified TINYINT DEFAULT 0,
    otp_code VARCHAR(6),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;
db.query(createTableQuery, (err) => {
    if (err) console.error("❌ Error creating table:", err);
    else console.log("✅ diagnostic_centers table ready");
});

// ✅ Generate 6-char alphanumeric ID
function generateCenterID() {
    return crypto.randomBytes(3).toString('hex').toUpperCase();
}

// ✅ Setup Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'spltechnologycorp@gmail.com',  // 🔹 replace with your email
        pass: 'cbkm ntdm cuvp vygh'      // 🔹 replace with app password
    }
});

// ✅ Send OTP API
router.post('/send-otp', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    // Check if email exists
    db.query("SELECT * FROM diagnostic_centers WHERE email=?", [email], (err, result) => {
        if (err) return res.status(500).json({ error: err });
        if (result.length > 0) return res.status(400).json({ error: 'Email already registered' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Send OTP via email
        const mailOptions = {
            from: 'spltechnologycorp@gmail.com',
            to: email,
            subject: 'Your OTP for Diagnostic Center Registration',
            text: `Your OTP is ${otp}. It is valid for 10 minutes.`
        };

        transporter.sendMail(mailOptions, (err) => {
            if (err) return res.status(500).json({ error: 'OTP sending failed', details: err });

            // Store OTP temporarily in DB
            db.query("INSERT INTO diagnostic_centers (center_id, email, otp_code, center_name, owner_name, phone, address, username, password) VALUES (?, ?, ?, 'TEMP', 'TEMP', '0', 'TEMP', 'TEMP', 'TEMP') ON DUPLICATE KEY UPDATE otp_code=?",
                [generateCenterID(), email, otp, otp],
                (err2) => {
                    if (err2) return res.status(500).json({ error: err2 });
                    res.json({ success: true, message: 'OTP sent successfully' });
                });
        });
    });
});

// ✅ Verify OTP API
router.post('/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    db.query("SELECT * FROM diagnostic_centers WHERE email=? AND otp_code=?", [email, otp], (err, result) => {
        if (err) return res.status(500).json({ error: err });
        if (result.length === 0) return res.status(400).json({ error: 'Invalid OTP' });

        db.query("UPDATE diagnostic_centers SET is_verified=1, otp_code=NULL WHERE email=?", [email], (err2) => {
            if (err2) return res.status(500).json({ error: err2 });
            res.json({ success: true, message: 'Email verified successfully' });
        });
    });
});

// ✅ Register Diagnostic Center API
router.post('/register', (req, res) => {
    const {
        centerName, ownerName, centerType, phone, altPhone, email, whatsapp,
        address, city, state, pincode, mapUrl, registrationNumber, gstNumber,
        services, homeSample, operationalHours, bankDetails, username, password
    } = req.body;

    // Check email verified
    db.query("SELECT * FROM diagnostic_centers WHERE email=? AND is_verified=1", [email], (err, result) => {
        if (err) return res.status(500).json({ error: err });
        if (result.length > 0 && result[0].center_name !== 'TEMP') {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const centerID = generateCenterID();

        const sql = `UPDATE diagnostic_centers SET center_id=?, center_name=?, owner_name=?, center_type=?, phone=?, alt_phone=?, whatsapp=?, address=?, city=?, state=?, pincode=?, map_url=?, registration_number=?, gst_number=?, services=?, home_sample=?, operational_hours=?, bank_details=?, username=?, password=? WHERE email=?`;
        const values = [centerID, centerName, ownerName, centerType, phone, altPhone, whatsapp, address, city, state, pincode, mapUrl, registrationNumber, gstNumber, services, homeSample, operationalHours, bankDetails, username, password, email];

        db.query(sql, values, (err2) => {
            if (err2) return res.status(500).json({ error: err2 });
            res.json({ success: true, message: 'Diagnostic center registered successfully', centerID });
        });
    });
});

module.exports = router;
