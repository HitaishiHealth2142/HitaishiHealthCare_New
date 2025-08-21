const express = require("express");
const router = express.Router();
const db = require("../db");
const multer = require("multer");
const path = require("path");

// --- MULTER CONFIGURATION FOR PROFILE IMAGE UPLOADS ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Ensure this directory exists
    cb(null, 'uploads/doctor_profiles/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'doctor-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.'), false);
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });


// --- MODIFIED DOCTORS TABLE with profile_image_url ---
const createDoctorsTable = `
  CREATE TABLE IF NOT EXISTS doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uid VARCHAR(10) UNIQUE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(100),
    mobile VARCHAR(20),
    address TEXT,
    clinic VARCHAR(255),
    license_number VARCHAR(100),
    aadhar_card VARCHAR(20) UNIQUE,
    experience VARCHAR(50),
    degree VARCHAR(100),
    university VARCHAR(100),
    specialization VARCHAR(100),
    availability VARCHAR(50),
    from_time VARCHAR(20),
    to_time VARCHAR(20),
    additional_info TEXT,
    password VARCHAR(255),
    profile_image_url VARCHAR(255), 
    otp_code VARCHAR(6) DEFAULT NULL
  )
`;

db.query(createDoctorsTable, (err) => {
  if (err) console.error("Failed to create doctors table:", err);
  else console.log("✅ Doctors table ready.");
});


// --- GET DOCTOR BY UID (No changes) ---
router.get("/gdoctors/:uid", (req, res) => {
  const { uid } = req.params;
  db.query("SELECT * FROM doctors WHERE uid = ?", [uid], (err, rows) => {
    if (err) return res.status(500).json({ message: "Server error!" });
    if (rows.length === 0) return res.status(404).json({ message: "Doctor not found!" });
    res.status(200).json(rows[0]);
  });
});


// --- NEW: GET DOCTOR STATS ---
router.get("/doctors/:uid/stats", (req, res) => {
    const { uid } = req.params;
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // NOTE: These queries assume an 'appointments' table exists.
    // You will need to create this table in your database.
    const queries = {
        today: `SELECT COUNT(*) as count FROM appointments WHERE doctor_uid = ? AND appointment_date = ?`,
        completed: `SELECT COUNT(*) as count FROM appointments WHERE doctor_uid = ? AND status = 'Completed'`,
        pending: `SELECT COUNT(*) as count FROM appointments WHERE doctor_uid = ? AND status = 'Pending' AND appointment_date >= ?`
    };

    const stats = {};
    db.query(queries.today, [uid, today], (err, todayRes) => {
        if (err) return res.status(500).json({ success: false, error: 'DB error' });
        stats.today = todayRes[0].count;

        db.query(queries.completed, [uid], (err, completedRes) => {
            if (err) return res.status(500).json({ success: false, error: 'DB error' });
            stats.completed = completedRes[0].count;

            db.query(queries.pending, [uid, today], (err, pendingRes) => {
                if (err) return res.status(500).json({ success: false, error: 'DB error' });
                stats.pending = pendingRes[0].count;
                res.json({ success: true, stats });
            });
        });
    });
});


// --- NEW: GET DOCTOR APPOINTMENTS ---
router.get("/doctors/:uid/appointments", (req, res) => {
    const { uid } = req.params;
    // This query assumes you have 'appointments' and 'patients' tables.
    const sql = `
        SELECT 
            p.name as patient_name,
            p.email as patient_email,
            a.patient_id,
            a.mode,
            a.appointment_date as date,
            a.appointment_time as time,
            a.payment_status
        FROM appointments a
        JOIN patients p ON a.patient_id = p.patient_id
        WHERE a.doctor_uid = ? AND a.status = 'Pending'
        ORDER BY a.appointment_date, a.appointment_time;
    `;
    db.query(sql, [uid], (err, results) => {
        if (err) {
            console.error("Error fetching appointments:", err);
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        res.json({ success: true, appointments: results });
    });
});

// --- NEW: GET DOCTOR TREATMENT HISTORY ---
router.get("/doctors/:uid/history", (req, res) => {
    const { uid } = req.params;
    const sql = `
        SELECT 
            p.name as patient_name,
            p.email as patient_email,
            a.patient_id,
            a.appointment_date as last_visit_date,
            a.status
        FROM appointments a
        JOIN patients p ON a.patient_id = p.patient_id
        WHERE a.doctor_uid = ? AND a.status = 'Completed'
        ORDER BY a.appointment_date DESC;
    `;
    db.query(sql, [uid], (err, results) => {
        if (err) {
            console.error("Error fetching history:", err);
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        res.json({ success: true, history: results });
    });
});


// --- MODIFIED: UPDATE DOCTOR PROFILE (with image upload) ---
router.put("/updatedoctors/:uid", upload.single('profile_image'), (req, res) => {
  const { uid } = req.params;
  const doctorData = req.body;

  // If a new file was uploaded, add its path to the data
  if (req.file) {
    // Store a web-accessible path, e.g., '/uploads/doctor_profiles/filename.jpg'
    doctorData.profile_image_url = `/uploads/doctor_profiles/${req.file.filename}`;
  }

  const sql = `UPDATE doctors SET 
    first_name = ?, last_name = ?, email = ?, mobile = ?, address = ?, clinic = ?, 
    license_number = ?, aadhar_card = ?, experience = ?, degree = ?, university = ?, 
    specialization = ?, availability = ?, from_time = ?, to_time = ?, additional_info = ?,
    profile_image_url = COALESCE(?, profile_image_url)
    WHERE uid = ?`;

  const values = [
    doctorData.first_name, doctorData.last_name, doctorData.email, doctorData.mobile, 
    doctorData.address, doctorData.clinic, doctorData.license_number, doctorData.aadhar_card, 
    doctorData.experience, doctorData.degree, doctorData.university, doctorData.specialization,
    doctorData.availability, doctorData.from_time, doctorData.to_time, doctorData.additional_info,
    doctorData.profile_image_url, // This will be the new URL or NULL if no file was uploaded
    uid
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
        console.error("Update error:", err);
        return res.status(500).json({ success: false, message: "Failed to update doctor details." });
    }
    if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: "Doctor not found!" });
    }
    
    // Fetch the updated doctor profile to send back to the client
    db.query("SELECT * FROM doctors WHERE uid = ?", [uid], (err, rows) => {
        if (err || rows.length === 0) {
            return res.status(500).json({ success: false, message: "Could not retrieve updated profile." });
        }
        res.status(200).json({ 
            success: true, 
            message: "Doctor updated successfully!",
            updatedDoctor: rows[0] 
        });
    });
  });
});

module.exports = router;