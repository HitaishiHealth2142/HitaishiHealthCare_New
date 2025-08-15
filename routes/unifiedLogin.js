// unifiedLogin.js
const express = require("express");
const router = express.Router();
const db = require("../db");

router.post("/unified-login", (req, res) => {
  const { email, password } = req.body;

  // 1. Check Doctors
  db.query("SELECT * FROM doctors WHERE email = ? AND password = ?", [email, password], (err, docResults) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (docResults.length > 0) {
      return res.json({ success: true, role: "doctor", user: docResults[0] });
    }

    // 2. Check Diagnostics
    db.query("SELECT * FROM diagnostic_centers WHERE email = ? AND password = ?", [email, password], (err, diagResults) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (diagResults.length > 0) {
        const user = diagResults[0];
        // --- FIX: Set session for diagnostic center ---
        req.session.isAuthenticated = true;
        req.session.user = { type: 'diagnostic', id: user.id, name: user.center_name, email: user.email };
        return res.json({ success: true, role: "diagnostic", user });
    }

      // 3. Check Patients
      db.query("SELECT * FROM patients WHERE email = ? AND password = ?", [email, password], (err, patResults) => {
        if (err) return res.status(500).json({ error: "Database error" });
        if (patResults.length > 0) {
          return res.json({ success: true, role: "patient", user: patResults[0] });
        }

        // 4. Not found anywhere
        res.status(404).json({ success: false, error: "User not found. Please register." });
      });
    });
  });
});

module.exports = router;
