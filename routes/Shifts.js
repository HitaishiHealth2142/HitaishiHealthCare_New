const express = require("express");
const router = express.Router();
const db = require("../db");

/* =========================================================
   CREATE SHIFTS TABLE (SAFE – NO MULTI STATEMENTS)
========================================================= */

// 1️⃣ Disable FK checks
db.query("SET FOREIGN_KEY_CHECKS = 0", err => {
  if (err) console.error("❌ FK disable error:", err.sqlMessage);
});

// 2️⃣ Create table
const createShiftsTable = `
CREATE TABLE IF NOT EXISTS ambulance_shifts (
  shift_id INT AUTO_INCREMENT PRIMARY KEY,
  ambulance_id INT NOT NULL,
  driver_id INT NOT NULL,
  shift_type ENUM('Shift1','Shift2','Shift3') NOT NULL,
  shift_start DATETIME NOT NULL,
  shift_end DATETIME NOT NULL,
  status ENUM('Scheduled','On-duty','Completed') DEFAULT 'Scheduled',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ambulance (ambulance_id),
  INDEX idx_driver (driver_id),
  CONSTRAINT fk_shift_ambulance
    FOREIGN KEY (ambulance_id)
    REFERENCES ambulances(ambulance_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_shift_driver
    FOREIGN KEY (driver_id)
    REFERENCES ambulance_drivers(driver_id)
    ON DELETE CASCADE
) ENGINE=InnoDB;
`;

db.query(createShiftsTable, err => {
  if (err) {
    console.error("❌ Ambulance shifts table creation failed:", err.sqlMessage);
  } else {
    console.log("✅ Ambulance shifts table ready");
  }
});

// 3️⃣ Re-enable FK checks
db.query("SET FOREIGN_KEY_CHECKS = 1", err => {
  if (err) console.error("❌ FK enable error:", err.sqlMessage);
});

/* =========================================================
   ASSIGN SHIFT (ADMIN OR PROVIDER)
========================================================= */
router.post("/shifts/assign", (req, res) => {
  const { ambulance_id, driver_id, shift_type, shift_date } = req.body;

  if (!ambulance_id || !driver_id || !shift_type || !shift_date) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  let startTime, endTime;

  switch (shift_type) {
    case "Shift1":
      startTime = "06:00:00";
      endTime = "14:00:00";
      break;
    case "Shift2":
      startTime = "14:00:00";
      endTime = "22:00:00";
      break;
    case "Shift3":
      startTime = "22:00:00";
      endTime = "06:00:00";
      break;
    default:
      return res.status(400).json({ error: "Invalid shift type" });
  }

  const shift_start = `${shift_date} ${startTime}`;
  const shift_end =
    shift_type === "Shift3"
      ? `${new Date(new Date(shift_date).getTime() + 86400000)
          .toISOString()
          .split("T")[0]} ${endTime}`
      : `${shift_date} ${endTime}`;

  db.query(
    `INSERT INTO ambulance_shifts
     (ambulance_id, driver_id, shift_type, shift_start, shift_end)
     VALUES (?, ?, ?, ?, ?)`,
    [ambulance_id, driver_id, shift_type, shift_start, shift_end],
    err => {
      if (err) {
        console.error("❌ Shift insert error:", err.sqlMessage);
        return res.status(500).json({ error: "Database error" });
      }

      res.status(201).json({
        success: true,
        message: "Shift assigned successfully"
      });
    }
  );
});

/* =========================================================
   LIVE AVAILABILITY CHECK (CRITICAL)
========================================================= */
router.get("/shifts/available-ambulances", (req, res) => {
  db.query(
    `
    SELECT DISTINCT
      a.ambulance_id,
      a.vehicle_number
    FROM ambulances a
    JOIN ambulance_providers p ON a.provider_id = p.id
    JOIN ambulance_shifts s ON s.ambulance_id = a.ambulance_id
    JOIN ambulance_drivers d ON s.driver_id = d.driver_id
    WHERE
      p.status = 'Approved'
      AND a.active_status = 'Active'
      AND d.status = 'Active'
      AND s.status = 'On-duty'
      AND NOW() BETWEEN s.shift_start AND s.shift_end
    `,
    (err, rows) => {
      if (err) {
        console.error("❌ Availability query error:", err.sqlMessage);
        return res.status(500).json({ error: "Database error" });
      }
      res.json({ available_ambulances: rows });
    }
  );
});

module.exports = router;
