const express = require('express');
const router = express.Router();
const db = require('../db'); // Import the database connection

/**
 * Creates the 'patients' table if it doesn't already exist.
 * This table stores all patient registration information.
 * The 'email' column is set to UNIQUE to prevent duplicate accounts.
 */
const createPatientsTable = `
  CREATE TABLE IF NOT EXISTS patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    mobile VARCHAR(20) NOT NULL,
    blood_group VARCHAR(10) NOT NULL,
    gender VARCHAR(10) NOT NULL,
    dob DATE NOT NULL,
    disease VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    password VARCHAR(255) NOT NULL
  )
`;


db.query(createPatientsTable, (err) => {
  if (err) {
    console.error("❌ Failed to create patients table:", err);
  } else {
    console.log("✅ Patients table is ready.");
  }
});

/**
 * Route to register a new patient.
 * It first checks if the system is locked by another user.
 * It also validates that the provided passwords match.
 */

// Helper: Check email across all roles
function checkEmailExists(email, callback) {
  const queries = [
    "SELECT email FROM doctors WHERE email = ?",
    "SELECT email FROM patients WHERE email = ?",
    "SELECT email FROM diagnostic_centers WHERE email = ?"
  ];

  let found = false;
  let checked = 0;

  queries.forEach(q => {
    db.query(q, [email], (err, results) => {
      if (err) return callback(err);
      if (results.length > 0) found = true;
      checked++;
      if (checked === queries.length) {
        callback(null, found);
      }
    });
  });
}

// Local role lock middleware
function localRoleLock(targetRole) {
  return (req, res, next) => {
    if (req.session?.isAuthenticated && req.session?.user?.type && req.session.user.type !== targetRole) {
      return res.status(409).json({
        error: `You are already logged in as '${req.session.user.type}' on this device. Please logout to switch to '${targetRole}'.`
      });
    }
    next();
  };
}

// Register a new patient
router.post('/patients', (req, res) => {
  const { 
    first_name, last_name, email, mobile, 
    blood_group, gender, dob, disease, address, 
    password, confirm_password 
  } = req.body;

  // ✅ Step 1: Confirm password check
  if (password !== confirm_password) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }


  // ✅ Step 2: Check email across all roles
  checkEmailExists(email, (err, exists) => {
    if (err) return res.status(500).json({ error: 'Database error during email check' });
    if (exists) return res.status(400).json({ error: 'Email already registered in another account type.' });

    // ✅ Step 3: Insert patient (confirm_password is NOT stored)
    const sql = `
      INSERT INTO patients 
        (first_name, last_name, email, mobile, blood_group, gender, dob, disease, address, password) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      first_name, last_name, email, mobile, blood_group, gender, dob, disease, address, password
    ];

    db.query(sql, values, (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ error: 'Email already registered.' });
        }
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error on registration' });
      }

      // ✅ Step 4: Set session
      req.session.isAuthenticated = true;
      req.session.user = { 
        type: 'patient', 
        id: result.insertId, 
        name: `${first_name} ${last_name}`, 
        email 
      };

      res.status(201).json({ 
        message: 'Patient added successfully', 
        patientId: result.insertId 
      });
    });
  });
});



/**
 * Route for patient login (local lock).
 * Prevents logging in with a different role in the same browser.
 * Records login times.
 */
router.post('/patientlogin', localRoleLock('patient'), (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'All fields are required' });

  // Validate user credentials
  const sql = 'SELECT * FROM patients WHERE email = ? AND password = ?';
  db.query(sql, [username, password], (err, results) => {
    if (err) {
      console.error("Login DB error (validating credentials):", err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (results.length === 0) return res.status(401).json({ error: 'Invalid email or password' });

    const user = results[0];

    // Set the session (local lock)
    req.session.isAuthenticated = true;
    req.session.user = { type: 'patient', id: user.id, name: `${user.first_name} ${user.last_name}`, email: user.email };

    // Record Login Time
    const loginActivityQuery = "INSERT INTO login_activity (session_id, user_id, user_type, login_time) VALUES (?, ?, ?, NOW())";
    db.query(loginActivityQuery, [req.sessionID, String(user.id), 'patient'], (logErr) => {
      if (logErr) console.error("Error logging login activity:", logErr);
    });

    res.status(200).json({
      message: 'Login successful',
      userId: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      fullName: user.first_name + ' ' + user.last_name
    });
  });
});

/**
 * Route to get a patient's profile by their ID.
 */
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

/**
 * Route to update a patient's profile information.
 */
router.put('/patient/profile', (req, res) => {
    const patientId = req.query.patientId;
    const { first_name, last_name, email, mobile, blood_group, gender, dob, disease, address } = req.body;
    if (!patientId) {
        return res.status(400).json({ error: 'Patient ID is required' });
    }
    const sql = `UPDATE patients SET 
        first_name = ?, last_name = ?, email = ?, mobile = ?, 
        blood_group = ?, gender = ?, dob = ?, disease = ?, address = ? 
        WHERE id = ?`;
    const values = [first_name, last_name, email, mobile, blood_group, gender, dob, disease, address, patientId];
    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Patient not found' });
        }
        res.status(200).json({ message: 'Profile updated successfully' });
    });
});

/**
 * Route to fetch all appointments for a specific patient.
 */
router.get('/patient/appointments', (req, res) => {
    const patientId = req.query.patientId;
    if (!patientId) {
        return res.status(400).json({ error: 'Patient ID is required' });
    }
    const sql = 'SELECT * FROM appointments WHERE patient_id = ? ORDER BY appointment_date DESC, appointment_time DESC';
    db.query(sql, [patientId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.status(200).json({ appointments: results });
    });
});

module.exports = router;