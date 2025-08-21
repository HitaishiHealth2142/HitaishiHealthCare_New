const express = require("express");
const router = express.Router();
const db = require("../db");

// =================================================================
// ✅ UPDATED: appointments_doctors table schema
// =================================================================
const createappointments_doctorsTable = `
CREATE TABLE IF NOT EXISTS appointments_doctors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT,
  patient_name VARCHAR(255),
  patient_email VARCHAR(255),
  doctor_id INT,
  doctor_name VARCHAR(255),
  doctor_email VARCHAR(255),
  doctor_specialization VARCHAR(255),
  appointment_date DATE,
  time_slot VARCHAR(50),
  status VARCHAR(50) DEFAULT 'Scheduled',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
`;

db.query(createappointments_doctorsTable, (err) => {
  if (err) {
    console.error("❌ Failed to create appointments_doctors table:", err);
  } else {
    console.log("✅ appointments_doctors table is ready.");
  }
});


// =================================================================
// ✅ UPDATED: POST route to book an appointment
// =================================================================
router.post("/appointments_doctors", (req, res) => {
  const {
    patientId,
    patientName,
    patientEmail,
    doctorId,
    doctorName,
    doctorEmail,
    doctorSpecialization,
    appointmentDate,
    timeSlot
  } = req.body;

  // --- Server-side validation ---
  if (!patientId || !doctorId || !appointmentDate || !timeSlot) {
      return res.status(400).json({ error: "Missing required appointment details." });
  }

  // --- Check for existing booking at the same time slot ---
  const checkQuery = "SELECT id FROM appointments_doctors WHERE doctor_id = ? AND appointment_date = ? AND time_slot = ?";
  db.query(checkQuery, [doctorId, appointmentDate, timeSlot], (checkErr, checkResult) => {
      if (checkErr) {
          console.error("❌ Error checking for existing appointment:", checkErr);
          return res.status(500).json({ error: "Database error while checking for appointment." });
      }

      if (checkResult.length > 0) {
          return res.status(409).json({ error: "This time slot has just been booked. Please select another one." });
      }

      // --- Insert new appointment ---
      const insertQuery = `
        INSERT INTO appointments_doctors (
          patient_id, patient_name, patient_email,
          doctor_id, doctor_name, doctor_email, doctor_specialization,
          appointment_date, time_slot
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        patientId, patientName, patientEmail,
        doctorId, doctorName, doctorEmail, doctorSpecialization,
        appointmentDate, timeSlot
      ];

      db.query(insertQuery, values, (insertErr, insertResult) => {
        if (insertErr) {
          console.error("❌ Error inserting appointment:", insertErr);
          return res.status(500).json({ error: "Database error while booking appointment" });
        }
        res.status(201).json({ message: "Appointment booked successfully!", appointmentId: insertResult.insertId });
      });
  });
});

module.exports = router;
