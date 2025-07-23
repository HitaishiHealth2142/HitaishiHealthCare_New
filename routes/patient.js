const express = require('express');
const router = express.Router();
const db = require('../db'); // Import the database connection



// Create the patients table if it doesn't exist
const createPatientsTable = `
  CREATE TABLE IF NOT EXISTS patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    blood_group VARCHAR(10) NOT NULL,
    gender VARCHAR(10) NOT NULL,
    dob DATE NOT NULL,
    disease VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    password VARCHAR(255) NOT NULL,
    confirm_password VARCHAR(255) NOT NULL
  )
`;

db.query(createPatientsTable, (err) => {
  if (err) {
    console.error("❌ Failed to create patients table:", err);
  } else {
    console.log("✅ Patients table is ready (or already exists).");
  }
});






// POST route to add a new patient
router.post('/patients', (req, res) => {
    const { first_name, last_name, email, mobile, blood_group, gender, dob, disease, address, password, confirm_password } = req.body;
    
    if (!first_name || !last_name || !email || !mobile || !blood_group || !gender || !dob || !disease || !address || !password || !confirm_password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const sql = 'INSERT INTO patients (first_name, last_name, email, mobile, blood_group, gender, dob, disease, address, password, confirm_password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const values = [first_name, last_name, email, mobile, blood_group, gender, dob, disease, address, password, confirm_password];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        res.status(201).json({ message: 'Patient added successfully', patientId: result.insertId });
    });
});

module.exports = router;
