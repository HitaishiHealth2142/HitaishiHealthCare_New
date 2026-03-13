const express = require("express");
const router = express.Router();
const db = require("../db");

router.post("/unified-login", (req, res) => {

  const { email, password } = req.body;

  console.log("🔐 Login attempt:", email);

  /* ==============================
     1️⃣ CHECK DOCTORS
  ============================== */

  db.query(
    "SELECT * FROM doctors WHERE email = ? AND password = ?",
    [email, password],
    (err, docResults) => {

      if (err) {
        console.error("❌ Doctor login DB error:", err);
        return res.status(500).json({ error: "Database error" });
      }

      if (docResults.length > 0) {

        const user = docResults[0];

        console.log("✅ Doctor authenticated:", user.uid);

        /* UPDATE DOCTOR ONLINE STATUS */

        db.query(
          "UPDATE doctors SET is_online = 1 WHERE uid = ?",
          [user.uid],
          (updateErr, updateResult) => {

            if (updateErr) {
              console.error("❌ Failed to update is_online:", updateErr);
            } else {
              console.log("🟢 Doctor marked ONLINE:", user.uid);
              console.log("Rows updated:", updateResult.affectedRows);
            }

          }
        );

        /* SESSION */

        req.session.isAuthenticated = true;

        req.session.user = {
          type: "doctor",
          id: user.id,
          uid: user.uid,
          name: user.first_name,
          email: user.email
        };

        return res.json({
          success: true,
          role: "doctor",
          user
        });
      }

      /* ==============================
         2️⃣ CHECK DIAGNOSTIC CENTERS
      ============================== */

      db.query(
        "SELECT * FROM diagnostic_centers WHERE email = ? AND password = ?",
        [email, password],
        (err, diagResults) => {

          if (err) {
            console.error("❌ Diagnostic login DB error:", err);
            return res.status(500).json({ error: "Database error" });
          }

          if (diagResults.length > 0) {

            const user = diagResults[0];

            console.log("✅ Diagnostic login:", user.center_id);

            req.session.isAuthenticated = true;

            req.session.user = {
              type: "diagnostic",
              id: user.center_id,
              center_id: user.center_id,
              name: user.center_name,
              email: user.email
            };

            return res.json({
              success: true,
              role: "diagnostic",
              user
            });
          }

          /* ==============================
             3️⃣ CHECK PATIENTS
          ============================== */

          db.query(
            "SELECT * FROM patients WHERE email = ? AND password = ?",
            [email, password],
            (err, patResults) => {

              if (err) {
                console.error("❌ Patient login DB error:", err);
                return res.status(500).json({ error: "Database error" });
              }

              if (patResults.length > 0) {

                const user = patResults[0];

                console.log("✅ Patient login:", user.email);

                req.session.isAuthenticated = true;

                req.session.user = {
                  type: "patient",
                  id: user.id,
                  unique_id: user.unique_id,
                  first_name: user.first_name,
                  last_name: user.last_name,
                  email: user.email,
                  mobile: user.mobile
                };

                return res.json({
                  success: true,
                  role: "patient",
                  user
                });
              }

              /* ==============================
                 4️⃣ INVALID LOGIN
              ============================== */

              console.log("❌ Invalid login:", email);

              return res.status(401).json({
                success: false,
                error: "Invalid email or password."
              });

            }
          );

        }
      );

    }
  );

});

module.exports = router;