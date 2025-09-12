const express = require('express');
const router = express.Router();
const db = require('../db'); // Assuming db.js is in the parent directory
const { randomBytes } = require('crypto');

// --- Helper function to generate a unique ID ---
const generateUniqueId = () => {
    return randomBytes(4).toString('hex');
};

// --- Create Doctor Reviews Table ---
const createDoctorReviewsTableQuery = `
CREATE TABLE IF NOT EXISTS doctor_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    review_id VARCHAR(10) UNIQUE NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    user_name VARCHAR(255),
    user_email VARCHAR(255),
    doctor_uid VARCHAR(10) NOT NULL,
    doctor_name VARCHAR(255),
    doctor_email VARCHAR(255),
    specialization VARCHAR(100),
    rating INT CHECK (rating >= 1 AND rating <= 10),
    review TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_uid) REFERENCES doctors(uid) ON DELETE CASCADE
);
`;
db.query(createDoctorReviewsTableQuery, (err) => {
    if (err) console.error('❌ Failed to create doctor_reviews table:', err.message);
    else console.log('✅ doctor_reviews table is ready.');
});


// --- Create Diagnostic Reviews Table ---
const createDiagnosticReviewsTableQuery = `
CREATE TABLE IF NOT EXISTS diagnostic_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    review_id VARCHAR(10) UNIQUE NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    user_name VARCHAR(255),
    user_email VARCHAR(255),
    center_id VARCHAR(10) NOT NULL,
    center_name VARCHAR(255),
    test_id VARCHAR(6) NOT NULL,
    test_name VARCHAR(255),
    rating INT CHECK (rating >= 1 AND rating <= 10),
    review TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (center_id) REFERENCES diagnostic_centers(center_id) ON DELETE CASCADE,
    FOREIGN KEY (test_id) REFERENCES diagnostic_test(test_id) ON DELETE CASCADE
);
`;
db.query(createDiagnosticReviewsTableQuery, (err) => {
    if (err) console.error('❌ Failed to create diagnostic_reviews table:', err.message);
    else console.log('✅ diagnostic_reviews table is ready.');
});


// --- ROUTE: SUBMIT A DOCTOR REVIEW ---
router.post('/doctor', async (req, res) => {
    const {
        userId, userName, userEmail, doctorUid, doctorName,
        doctorEmail, specialization, rating, review
    } = req.body;

    // Basic validation
    if (!userId || !doctorUid || !rating) {
        return res.status(400).json({ success: false, error: 'User ID, Doctor UID, and rating are required.' });
    }

    try {
        const review_id = generateUniqueId();
        const insertQuery = `
            INSERT INTO doctor_reviews (review_id, user_id, user_name, user_email, doctor_uid, doctor_name, doctor_email, specialization, rating, review)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [review_id, userId, userName, userEmail, doctorUid, doctorName, doctorEmail, specialization, rating, review];

        await db.promise().query(insertQuery, values);
        res.status(201).json({ success: true, message: 'Doctor review submitted successfully.', review_id });

    } catch (error) {
        console.error('Error submitting doctor review:', error);
        res.status(500).json({ success: false, error: 'Server error occurred.' });
    }
});


// --- ROUTE: SUBMIT A DIAGNOSTIC TEST REVIEW ---
router.post('/diagnostic', async (req, res) => {
    const {
        userId, userName, userEmail, centerId, centerName,
        testId, testName, rating, review
    } = req.body;

    // Basic validation
    if (!userId || !centerId || !testId || !rating) {
        return res.status(400).json({ success: false, error: 'User ID, Center ID, Test ID, and rating are required.' });
    }

    try {
        const review_id = generateUniqueId();
        const insertQuery = `
            INSERT INTO diagnostic_reviews (review_id, user_id, user_name, user_email, center_id, center_name, test_id, test_name, rating, review)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [review_id, userId, userName, userEmail, centerId, centerName, testId, testName, rating, review];

        await db.promise().query(insertQuery, values);
        res.status(201).json({ success: true, message: 'Diagnostic review submitted successfully.', review_id });

    } catch (error) {
        console.error('Error submitting diagnostic review:', error);
        res.status(500).json({ success: false, error: 'Server error occurred.' });
    }
});

// --- ROUTE: GET REVIEWS FOR A DOCTOR ---
router.get('/doctor/:doctorUid', async (req, res) => {
    const { doctorUid } = req.params;
    try {
        const [rows] = await db.promise().query('SELECT * FROM doctor_reviews WHERE doctor_uid = ? ORDER BY created_at DESC', [doctorUid]);
        res.json({ success: true, reviews: rows });
    } catch (error) {
        console.error('Error fetching doctor reviews:', error);
        res.status(500).json({ success: false, error: 'Server error.' });
    }
});

// --- ROUTE: GET REVIEWS FOR A TEST ---
router.get('/test/:testId', async (req, res) => {
    const { testId } = req.params;
    try {
        const [rows] = await db.promise().query('SELECT * FROM diagnostic_reviews WHERE test_id = ? ORDER BY created_at DESC', [testId]);
        res.json({ success: true, reviews: rows });
    } catch (error) {
        console.error('Error fetching test reviews:', error);
        res.status(500).json({ success: false, error: 'Server error.' });
    }
});


module.exports = router;
