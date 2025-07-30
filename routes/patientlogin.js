const express = require('express');
const router = express.Router();
const db = require('../db'); // Import database connection

// POST route for patient login
router.post('/patientlogin', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user exists
    const sql = 'SELECT * FROM patients WHERE email = ? AND password = ?';
    db.query(sql, [username, password], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (results.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = results[0];

        const fullName = `${user.first_name} ${user.last_name}`;
        res.status(200).json({ 
        message: 'Login successful', 
        userId: user.id, 
        first_name: user.first_name, 
        last_name: user.last_name, 
        name: fullName 
        });
    });
});

module.exports = router;
