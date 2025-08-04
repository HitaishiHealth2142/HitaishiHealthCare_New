const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// ✅ Create or update the table schema
const createTableQuery = `
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
    username VARCHAR(255),
    password VARCHAR(255),
    is_verified TINYINT DEFAULT 0,
    otp_code VARCHAR(6),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

db.query(createTableQuery, (err) => {
    if (err) console.error("❌ Error creating table:", err);
    else console.log("✅ diagnostic_centers table ready");
});

// ✅ Generate 6-character alphanumeric ID
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

// ✅ Utility function to send email
async function sendEmail(to, subject, html) {
    try {
        const mailOptions = { from: 'spltechnologycorp@gmail.com', to, subject, html };
        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent to ${to}`);
    } catch (error) {
        console.error(`❌ Error sending email to ${to}:`, error);
    }
}

// ✅ Send OTP API
router.post('/diagnostics/send-otp', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Check if a diagnostic center with this email already exists and is verified
    const checkEmailQuery = "SELECT * FROM diagnostic_centers WHERE email = ? AND is_verified = 1";
    db.query(checkEmailQuery, [email], (err, result) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (result.length > 0) {
            return res.status(400).json({ error: 'Email already registered and verified.' });
        }

        // If email exists but is not verified, update the existing row with the new OTP.
        const updateExistingQuery = "UPDATE diagnostic_centers SET otp_code = ? WHERE email = ?";
        db.query(updateExistingQuery, [otp, email], (err, updateResult) => {
            if (err) return res.status(500).json({ error: 'Database error' });

            if (updateResult.affectedRows === 0) {
                // If email does not exist, create a new temporary entry
                const insertQuery = "INSERT INTO diagnostic_centers (email, otp_code) VALUES (?, ?)";
                db.query(insertQuery, [email, otp], (err) => {
                    if (err) return res.status(500).json({ error: 'Database error' });
                });
            }
            
            // Send OTP via email
            const mailHtml = `
                <div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
                    <h2>Hitaishi Healthcare OTP Verification</h2>
                    <p>Your OTP for registration is:</p>
                    <div style="background-color: #f0f0f0; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
                        ${otp}
                    </div>
                    <p>This OTP is valid for 10 minutes.</p>
                </div>
            `;
            sendEmail(email, 'Hitaishi Healthcare: OTP Verification', mailHtml);
            res.json({ success: true, message: 'OTP sent to your email.' });
        });
    });
});

// ✅ Verify OTP API
router.post('/diagnostics/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

    db.query("SELECT * FROM diagnostic_centers WHERE email = ? AND otp_code = ?", [email, otp], (err, result) => {
        if (err) return res.status(500).json({ error: err });
        if (result.length > 0) {
            const updateVerificationQuery = "UPDATE diagnostic_centers SET is_verified = 1, otp_code = NULL WHERE email = ?";
            db.query(updateVerificationQuery, [email], (err) => {
                if (err) return res.status(500).json({ error: err });
                res.json({ success: true, message: 'OTP verified successfully!' });
            });
        } else {
            res.status(400).json({ error: 'Invalid OTP' });
        }
    });
});


// ✅ Registration API
router.post('/diagnostics/register', (req, res) => {
    // Destructure all fields from the request body
    const {
        centerName, ownerName, centerType, phone, altPhone, email, whatsapp,
        address, city, state, pincode, mapUrl, registrationNumber, gstNumber,
        services, homeSample, fromTime, toTime, accountHolderName, bankName,
        accountNumber, ifscCode, upiId, panAadhar, licenseCopy, upiQrCode,
        password
    } = req.body;

    // Check if the user is verified before proceeding
    db.query("SELECT * FROM diagnostic_centers WHERE email = ? AND is_verified = 1", [email], (err, result) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (result.length === 0) {
            return res.status(400).json({ error: 'Email not verified. Please verify your OTP first.' });
        }
        
        // Generate a unique center ID
        const centerID = generateCenterID();

        // Convert services and operational hours to JSON strings for storage
        const servicesJson = JSON.stringify(services);
        const operationalHoursJson = JSON.stringify({ from: fromTime, to: toTime });

        const sql = `
            UPDATE diagnostic_centers SET
            center_id = ?,
            center_name = ?,
            owner_name = ?,
            center_type = ?,
            phone = ?,
            alt_phone = ?,
            whatsapp = ?,
            address = ?,
            city = ?,
            state = ?,
            pincode = ?,
            map_url = ?,
            registration_number = ?,
            gst_number = ?,
            services = ?,
            home_sample = ?,
            operational_hours = ?,
            account_holder_name = ?,
            bank_name = ?,
            account_number = ?,
            ifsc_code = ?,
            upi_id = ?,
            pan_aadhar_jpeg = ?,
            license_copy_jpeg = ?,
            upi_qr_code_jpeg = ?,
            password = ?
            WHERE email = ?;
        `;
        const values = [
            centerID, centerName, ownerName, centerType, phone, altPhone, whatsapp,
            address, city, state, pincode, mapUrl, registrationNumber, gstNumber,
            servicesJson, homeSample, operationalHoursJson, accountHolderName, bankName,
            accountNumber, ifscCode, upiId, panAadhar, licenseCopy, upiQrCode,
            password, email
        ];

        db.query(sql, values, (err2) => {
            if (err2) {
                console.error("❌ Registration error:", err2);
                return res.status(500).json({ error: 'Error during registration. Please check the provided data.' });
            }

            // Send a success email to the user
            const successMailHtml = `
                <div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
                    <h2>Registration Successful!</h2>
                    <p>Dear ${ownerName},</p>
                    <p>Congratulations! Your diagnostic center, <b>${centerName}</b>, has been successfully registered with Hitaishi Healthcare.</p>
                    <p>Your unique Center ID is: <b>${centerID}</b></p>
                    <p>You can now log in to your dashboard to manage your services and bookings.</p>
                    <p>Thank you for joining the Hitaishi Healthcare family!</p>
                    <p>Best regards,<br>The Hitaishi Healthcare Team</p>
                </div>
            `;
            sendEmail(email, 'Welcome to Hitaishi Healthcare!', successMailHtml);

            res.json({ success: true, message: 'Registration successful! A confirmation email has been sent.' });
        });
    });
});

// ✅ Login Route
router.post('/diagnostics/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const query = "SELECT * FROM diagnostic_centers WHERE email = ? AND password = ?";
    db.query(query, [email, password], (err, result) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (result.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        res.json({ success: true, message: 'Login successful', user: result[0] });
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
