const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const db = require("../db");
require("dotenv").config();

const router = express.Router();

/* =========================================================
   0️⃣ AUTO CREATE ADMINS TABLE (Runs When Route Loads)
========================================================= */
const createAdminTableQuery = `
CREATE TABLE IF NOT EXISTS admins (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin',
    is_verified BOOLEAN DEFAULT FALSE,
    otp VARCHAR(6),
    otp_expiry DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

db.query(createAdminTableQuery, (err) => {
    if (err) {
        console.error("❌ Admin table creation failed:", err);
    } else {
        console.log("✅ Admin table ready");
    }
});


/* =========================================================
   📧 Zoho Mail Transporter
========================================================= */
const transporter = nodemailer.createTransport({
    host: "smtp.zoho.in",
    port: 465,
    secure: true,
    auth: {
        user: process.env.ZOHO_EMAIL,
        pass: process.env.ZOHO_PASS
    }
});


/* =========================================================
   🔢 Generate OTP
========================================================= */
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}


/* =========================================================
   1️⃣ REGISTER ADMIN (Only If No Admin Exists)
========================================================= */
router.post("/admin/register", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password)
        return res.status(400).json({ message: "Email & password required" });

    db.query("SELECT * FROM admins LIMIT 1", async (err, result) => {
        if (err) return res.status(500).json({ message: "DB error" });

        if (result.length > 0)
            return res.status(403).json({ message: "Admin already exists" });

        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const otp = generateOTP();
            const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

            db.query(
                "INSERT INTO admins (email, password, otp, otp_expiry) VALUES (?, ?, ?, ?)",
                [email, hashedPassword, otp, otpExpiry],
                async (err) => {
                    if (err)
                        return res.status(500).json({ message: "Insert failed" });

                    await transporter.sendMail({
                        from: `"24x7 Health Admin" <${process.env.ZOHO_EMAIL}>`,
                        to: email,
                        subject: "Admin Registration OTP",
                        html: `
                            <h2>Admin Registration Verification</h2>
                            <p>Your OTP:</p>
                            <h1>${otp}</h1>
                            <p>Valid for 10 minutes.</p>
                        `
                    });

                    res.json({ message: "OTP sent to email" });
                }
            );
        } catch {
            res.status(500).json({ message: "Server error" });
        }
    });
});


/* =========================================================
   2️⃣ VERIFY REGISTER OTP
========================================================= */
router.post("/admin/verify-register-otp", (req, res) => {
    const { email, otp } = req.body;

    db.query("SELECT * FROM admins WHERE email = ?", [email], (err, result) => {
        if (result.length === 0)
            return res.status(400).json({ message: "Admin not found" });

        const admin = result[0];

        if (admin.otp !== otp)
            return res.status(400).json({ message: "Invalid OTP" });

        if (new Date(admin.otp_expiry) < new Date())
            return res.status(400).json({ message: "OTP expired" });

        db.query(
            "UPDATE admins SET is_verified = TRUE, otp = NULL, otp_expiry = NULL WHERE email = ?",
            [email]
        );

        res.json({ message: "Admin verified successfully" });
    });
});


/* =========================================================
   3️⃣ LOGIN (Email + Password → Send OTP)
========================================================= */
router.post("/admin/login", async (req, res) => {
    const { email, password } = req.body;

    db.query("SELECT * FROM admins WHERE email = ?", [email], async (err, result) => {
        if (result.length === 0)
            return res.status(401).json({ message: "Invalid credentials" });

        const admin = result[0];

        if (!admin.is_verified)
            return res.status(403).json({ message: "Admin not verified" });

        const match = await bcrypt.compare(password, admin.password);
        if (!match)
            return res.status(401).json({ message: "Invalid credentials" });

        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        db.query(
            "UPDATE admins SET otp = ?, otp_expiry = ? WHERE email = ?",
            [otp, otpExpiry, email]
        );

        await transporter.sendMail({
            from: `"24x7 Health Admin" <${process.env.ZOHO_EMAIL}>`,
            to: email,
            subject: "Admin Login OTP",
            html: `
                <h2>Admin Login Verification</h2>
                <p>Your OTP:</p>
                <h1>${otp}</h1>
                <p>Valid for 10 minutes.</p>
            `
        });

        res.json({ message: "OTP sent to email" });
    });
});


/* =========================================================
   4️⃣ VERIFY LOGIN OTP → GENERATE JWT
========================================================= */
router.post("/admin/verify-login-otp", (req, res) => {
    const { email, otp } = req.body;

    db.query("SELECT * FROM admins WHERE email = ?", [email], (err, result) => {
        if (result.length === 0)
            return res.status(401).json({ message: "Admin not found" });

        const admin = result[0];

        if (admin.otp !== otp)
            return res.status(400).json({ message: "Invalid OTP" });

        if (new Date(admin.otp_expiry) < new Date())
            return res.status(400).json({ message: "OTP expired" });

        const token = jwt.sign(
            { id: admin.id, role: admin.role },
            process.env.JWT_SECRET,
            { expiresIn: "8h" }
        );

        db.query(
            "UPDATE admins SET otp = NULL, otp_expiry = NULL WHERE email = ?",
            [email]
        );

        res.json({ message: "Login successful", token });
    });
});

module.exports = router;