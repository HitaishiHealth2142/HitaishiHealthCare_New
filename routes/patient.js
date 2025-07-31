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

// POST route for patient login
router.post('/patientlogin', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const sql = 'SELECT * FROM patients WHERE email = ? AND password = ?';
    db.query(sql, [username, password], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (results.length === 0) return res.status(401).json({ error: 'Invalid email or password' });

        const user = results[0];

        res.status(200).json({
            message: 'Login successful',
            userId: user.id,
            // first_name: user.first_name,   
            firstName: user.first_name,    
            // last_name: user.last_name,
            lastName: user.last_name,
            fullName: user.first_name + '' + user.last_name
            // console.log(fullName),
        });

        console.log("🔍 Login user data sent:", user);
    });
});


router.get('/patients/:id', (req, res) => {
    const patientId = req.params.id;

    const sql = 'SELECT id, first_name, last_name, email, mobile, blood_group, gender, dob, disease, address FROM patients WHERE id = ?';

    db.query(sql, [patientId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Patient not found' });
        }

        res.status(200).json({ patient: results[0] });
    });
});



module.exports = router;
