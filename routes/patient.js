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

  // 🔒 Block registration if someone else is logged in
  db.query("SELECT is_locked, session_id FROM session_lock WHERE id=1", (e, rows) => {
    if (e) return res.status(500).json({ error: 'DB error' });
    const lock = rows[0];
    if (lock?.is_locked && lock.session_id !== req.sessionID) {
      return res.status(423).json({ error: 'The system is currently in use by another user. Please try later.' });
    }

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
});


// POST route for patient login (with global lock)
router.post('/patientlogin', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'All fields are required' });

  // 1) If locked by another session, block
  db.query("SELECT is_locked, session_id FROM session_lock WHERE id=1", (e, rows) => {
    if (e) return res.status(500).json({ error: 'DB error' });
    const lock = rows[0];

    if (lock?.is_locked && lock.session_id !== req.sessionID) {
      return res.status(423).json({ error: 'Another user is currently logged in.' });
    }

    // 2) Validate credentials
    const sql = 'SELECT * FROM patients WHERE email = ? AND password = ?';
    db.query(sql, [username, password], (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (results.length === 0) return res.status(401).json({ error: 'Invalid email or password' });

      const user = results[0];

      // 3) Set session and acquire lock
      req.session.isAuthenticated = true;
      req.session.user = { type: 'patient', id: user.id, name: `${user.first_name} ${user.last_name}`, email: user.email };

      db.query(
        "UPDATE session_lock SET is_locked=1, session_id=?, user_type='patient', user_id=?, started_at=NOW() WHERE id=1",
        [req.sessionID, String(user.id)],
        (uErr) => {
          if (uErr) return res.status(500).json({ error: 'DB error acquiring lock' });

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

// GET route to fetch patient profile
router.get('/patient/profile', (req, res) => {
    // In a real app, you'd get patientId from session/token
    const patientId = req.query.patientId; // For now using query param
    
    if (!patientId) {
        return res.status(400).json({ error: 'Patient ID is required' });
    }

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

// PUT route to update patient profile
router.put('/patient/profile', (req, res) => {
    const patientId = req.query.patientId;
    const { first_name, last_name, email, mobile, blood_group, gender, dob, disease, address } = req.body;
    
    if (!patientId) {
        return res.status(400).json({ error: 'Patient ID is required' });
    }

    const sql = `UPDATE patients SET 
        first_name = ?, 
        last_name = ?, 
        email = ?, 
        mobile = ?, 
        blood_group = ?, 
        gender = ?, 
        dob = ?, 
        disease = ?, 
        address = ? 
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

// GET route to fetch patient appointments
router.get('/patient/appointments', (req, res) => {
    const patientId = req.query.patientId;
    
    if (!patientId) {
        return res.status(400).json({ error: 'Patient ID is required' });
    }

    // In a real app, you'd join with doctors/clinics tables to get more details
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
