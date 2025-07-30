const express = require("express");
const router = express.Router();
const db = require("../db");
const multer = require("multer");
const crypto = require("crypto");

const upload = multer();

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
    password VARCHAR(255)
  )
`;

db.query(createDoctorsTable, (err) => {
  if (err) {
    console.error("Failed to create doctors table:", err);
  } else {
    console.log("✅ Doctors table ready (or already exists).");
  }
});

// register a new doctor
router.post("/doctors", upload.none(), async (req, res) => {
  const {
    first_name, last_name, email, mobile, address, clinic, license_number,
    aadhar_card, experience, degree, university, specialization,
    availability, from_time, to_time, additional_info, password
  } = req.body;

  const uid = crypto.randomBytes(3).toString("hex");

  db.query("SELECT * FROM doctors WHERE aadhar_card = ?", [aadhar_card], (err, results) => {
    if (err) return res.status(500).json({ message: "Error checking Aadhar." });

    if (results.length > 0) {
      return res.status(400).json({ message: "Aadhar already registered." });
    }

    const sql = `INSERT INTO doctors 
      (uid, first_name, last_name, email, mobile, address, clinic, license_number, aadhar_card,
      experience, degree, university, specialization, availability, from_time, to_time, additional_info, password) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = [
      uid, first_name, last_name, email, mobile, address, clinic, license_number, aadhar_card,
      experience, degree, university, specialization, availability, from_time, to_time, additional_info, password
    ];

    db.query(sql, values, (err) => {
      if (err) return res.status(500).json({ message: "Error registering doctor." });
      res.status(201).json({ message: "Doctor registered successfully!", uid });
    });
  });
});

// doctor login
router.post("/doctorlogin", async (req, res) => {
  const { email, password } = req.body;

  db.query("SELECT * FROM doctors WHERE email = ?", [email], (err, results) => {
    if (err) return res.status(500).json({ message: "Database error during login!" });
    if (results.length === 0) return res.status(404).json({ message: "Doctor not found." });

    const doctor = results[0];
    if (doctor.password !== password) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    res.status(200).json({
      message: "Login successful",
      user: {
        uid: doctor.uid,
        email: doctor.email,
        name: `${doctor.first_name} ${doctor.last_name}`
      }
    });
  });
});

// get filters for doctors
router.get("/getfilters", (req, res) => {
  const filters = { specialization: [], clinic: [], address: [] };

  db.query("SELECT DISTINCT specialization FROM doctors", (err, specResults) => {
    if (err) return res.status(500).json({ message: "Error fetching specializations!" });
    filters.specialization = specResults.map(r => r.specialization).filter(Boolean);

    db.query("SELECT DISTINCT clinic FROM doctors", (err, clinicResults) => {
      if (err) return res.status(500).json({ message: "Error fetching clinics!" });
      filters.clinic = clinicResults.map(r => r.clinic).filter(Boolean);

      db.query("SELECT DISTINCT address FROM doctors", (err, locResults) => {
        if (err) return res.status(500).json({ message: "Error fetching addresses!" });
        filters.address = locResults.map(r => r.address).filter(Boolean);
        res.json(filters);
      });
    });
  });
});

// get all doctors
router.get("/getdoctors", (req, res) => {
  db.query("SELECT * FROM doctors", (err, rows) => {
    if (err) return res.status(500).json({ message: "Error fetching doctors!" });
    res.status(200).json(rows);
  });
});

// get a doctor by uid
router.get("/gdoctors/:uid", (req, res) => {
  const { uid } = req.params;
  db.query("SELECT * FROM doctors WHERE uid = ?", [uid], (err, rows) => {
    if (err) return res.status(500).json({ message: "Server error!" });
    if (rows.length === 0) return res.status(404).json({ message: "Doctor not found!" });
    res.status(200).json(rows[0]);
  });
});

router.put("/updatedoctors/:uid", (req, res) => {
  const { uid } = req.params;
  const {
    first_name, last_name, email, mobile, address, clinic, license_number,
    aadhar_card, experience, degree, university, specialization,
    availability, from_time, to_time, additional_info
  } = req.body;

  const sql = `UPDATE doctors SET 
    first_name = ?, last_name = ?, email = ?, mobile = ?, address = ?, clinic = ?, 
    license_number = ?, aadhar_card = ?, experience = ?, degree = ?, university = ?, 
    specialization = ?, availability = ?, from_time = ?, to_time = ?, additional_info = ? 
    WHERE uid = ?`;

  const values = [
    first_name, last_name, email, mobile, address, clinic, license_number,
    aadhar_card, experience, degree, university, specialization,
    availability, from_time, to_time, additional_info, uid
  ];

  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json({ message: "Failed to update doctor details." });
    if (result.affectedRows === 0) return res.status(404).json({ message: "Doctor not found!" });
    res.status(200).json({ message: "Doctor updated successfully!" });
  });
});

router.delete("/deletedoctors/:uid", (req, res) => {
  const { uid } = req.params;
  db.query("DELETE FROM doctors WHERE uid = ?", [uid], (err, result) => {
    if (err) return res.status(500).json({ message: "Failed to delete doctor." });
    if (result.affectedRows === 0) return res.status(404).json({ message: "Doctor not found!" });
    res.status(200).json({ message: "Doctor deleted successfully!" });
  });
});

module.exports = router;
