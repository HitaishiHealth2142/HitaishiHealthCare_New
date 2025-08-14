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
router.post('/patients', (req, res) => {
  const { first_name, last_name, email, mobile, blood_group, gender, dob, disease, address, password, confirm_password } = req.body;

  if (password !== confirm_password) {
      return res.status(400).json({ error: 'Passwords do not match.' });
  }

  // Block registration if another user is logged in.
  db.query("SELECT is_locked, session_id FROM session_lock WHERE id=1", (e, rows) => {
    if (e) return res.status(500).json({ error: 'DB error checking lock' });
    const lock = rows[0];
    if (lock?.is_locked && lock.session_id !== req.sessionID) {
      return res.status(423).json({ error: 'The system is currently in use by another user. Please try later.' });
    }

    const sql = 'INSERT INTO patients (first_name, last_name, email, mobile, blood_group, gender, dob, disease, address, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const values = [first_name, last_name, email, mobile, blood_group, gender, dob, disease, address, password];

    db.query(sql, values, (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Email already registered.' });
        }
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error on registration' });
      }
      res.status(201).json({ message: 'Patient added successfully', patientId: result.insertId });
    });
  });
});


/**
 * Route for patient login.
 * Handles the global session lock and records login/logout times.
 */
router.post('/patientlogin', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'All fields are required' });

  // 1) Check if the system is locked by another session.
  db.query("SELECT is_locked, session_id FROM session_lock WHERE id=1", (e, rows) => {
    if (e) {
        console.error("Login DB error (checking lock):", e);
        return res.status(500).json({ error: 'DB error' });
    }
    const lock = rows[0];

    if (lock?.is_locked && lock.session_id !== req.sessionID) {
      return res.status(423).json({ error: 'Another user is currently logged in.' });
    }

    // 2) Validate user credentials.
    const sql = 'SELECT * FROM patients WHERE email = ? AND password = ?';
    db.query(sql, [username, password], (err, results) => {
      if (err) {
        console.error("Login DB error (validating credentials):", err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (results.length === 0) return res.status(401).json({ error: 'Invalid email or password' });

      const user = results[0];

      // 3) Set the session, acquire the global lock, and log the event.
      req.session.isAuthenticated = true;
      req.session.user = { type: 'patient', id: user.id, name: `${user.first_name} ${user.last_name}`, email: user.email };

      db.query(
        "UPDATE session_lock SET is_locked=1, session_id=?, user_type='patient', user_id=?, started_at=NOW() WHERE id=1",
        [req.sessionID, String(user.id)],
        (uErr) => {
          if (uErr) {
            console.error("Login DB error (acquiring lock):", uErr);
            return res.status(500).json({ error: 'DB error acquiring lock' });
          }

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
        }
      );
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