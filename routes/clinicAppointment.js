const express = require("express");
const router = express.Router();
const db = require("../db");

// =============================
// CREATE TABLE IF NOT EXISTS
// =============================

const createAppointmentTable = `
CREATE TABLE IF NOT EXISTS clinic_appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    appointment_datetime DATETIME NOT NULL,
    message TEXT,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
`;

db.query(createAppointmentTable, (err) => {
  if (err) {
    console.error("❌ Failed to create clinic_appointments table:", err);
  } else {
    console.log("✅ clinic_appointments table ready");
  }
});


// =============================
// POST - REGISTER APPOINTMENT
// =============================

router.post("/appointment_clinic", (req, res) => {

  const { name, email, phone, date, message } = req.body;

  if (!name || !email || !phone || !date) {
    return res.status(400).json({
      error: "Missing required fields"
    });
  }

  const sql = `
    INSERT INTO clinic_appointments
    (name, email, phone, appointment_datetime, message)
    VALUES (?, ?, ?, ?, ?)
  `;

  const values = [name, email, phone, date, message || null];

  db.query(sql, values, (err, result) => {

    if (err) {
      console.error("MySQL Insert Error:", err);
      return res.status(500).json({
        error: "Database error"
      });
    }

    res.status(201).json({
      message: "Appointment booked successfully",
      appointmentId: result.insertId
    });

  });

});


// =============================
// GET - FETCH APPOINTMENTS
// =============================

router.get("/appointment_clinic", (req, res) => {

  const sql = `
    SELECT
      id,
      name,
      email,
      phone,
      appointment_datetime,
      message,
      status,
      created_at
    FROM clinic_appointments
    ORDER BY created_at DESC
  `;

  db.query(sql, (err, results) => {

    if (err) {
      console.error("MySQL Fetch Error:", err);
      return res.status(500).json({
        error: "Database error"
      });
    }

    res.json(results);

  });

});

module.exports = router;