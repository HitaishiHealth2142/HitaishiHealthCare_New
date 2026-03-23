const express = require("express");
const router = express.Router();
const db = require("../db");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

// --- MULTER CONFIGURATION FOR PROFILE IMAGE UPLOADS ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Ensure this directory exists
    cb(null, 'uploads/doctor_profiles/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'doctor-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.'), false);
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });
const uploadNoFile = multer(); // handles form-data without files


// --- DOCTORS TABLE ---
const createDoctorsTable = `
  CREATE TABLE IF NOT EXISTS doctors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uid VARCHAR(10) UNIQUE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(100) UNIQUE,
  mobile VARCHAR(20),
  wallet_balance INT DEFAULT 0,
  door_no VARCHAR(100),
  area VARCHAR(150),
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  zipcode VARCHAR(20),
  clinic VARCHAR(255),
  license_number VARCHAR(100),
  aadhar_card VARCHAR(20) UNIQUE,
  experience VARCHAR(50),
  degree VARCHAR(100),
  university VARCHAR(100),
  specialization VARCHAR(100),
  availability VARCHAR(50),
  from_time VARCHAR(20),
  to_time VARCHAR(20),
  additional_info TEXT,
  password VARCHAR(255),
  profile_image_url VARCHAR(255),
  is_online BOOLEAN DEFAULT FALSE,
  consultation_fee INT DEFAULT 500,
  instant_consultation BOOLEAN DEFAULT TRUE
)
`;

db.query(createDoctorsTable, (err) => {
  if (err) console.error("Failed to create doctors table:", err);
  else console.log("✅ Doctors table ready.");
});

// --- APPOINTMENTS TABLE ---
// const createAppointmentsTable = `
//   CREATE TABLE IF NOT EXISTS appointments (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//     doctor_id INT NOT NULL,
//     doctor_uid VARCHAR(10),
//     patient_id INT,
//     patient_name VARCHAR(100),
//     appointment_time TIME NOT NULL,
//     appointment_date DATE NOT NULL,
//     slot_time TIME,
//     slot_date DATE,
//     mode VARCHAR(50),
//     payment_status VARCHAR(50),
//     status VARCHAR(50) DEFAULT 'Pending',
//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//     UNIQUE KEY unique_slot (doctor_id, appointment_time, appointment_date)
//   )
// `;

// db.query(createAppointmentsTable, (err, result) => {
//   if (err) {
//     console.error('Error creating appointments table:', err);
//   } else {
//     console.log('✅ Appointments table ensured/created successfully.');
//   }
// });



// ==================== REGISTRATION & LOGIN ====================

// Register Doctor (from eyedoctors.js)
router.post("/doctors", upload.single("profile_image"), (req, res) => {
  
  let profileImagePath = null;

  if (req.file) {
    profileImagePath = `/uploads/doctor_profiles/${req.file.filename}`;
  }

  let {first_name, last_name, email, mobile, door_no, area, city, state, country, zipcode, clinic, license_number, aadhar_card, experience, degree, university, specialization, availability, from_time, to_time, additional_info, password } = req.body;

  // Convert specialization to uppercase
  specialization = specialization ? specialization.trim().toUpperCase() : null;

  const uid = crypto.randomBytes(5).toString("hex"); // Generate 10-char UID

  // Check for duplicate Aadhar
  db.query("SELECT * FROM doctors WHERE aadhar_card = ?", [aadhar_card], (err, results) => {
      if (err) return res.status(500).json({ message: "Error checking Aadhar." });

      if (results.length > 0) {
          return res.status(400).json({ message: "Aadhar already registered." });
      }

      // If not duplicate, insert into DB
      const sql = `INSERT INTO doctors 
                  (uid, first_name, last_name, email, mobile,
                  door_no, area, city, state, country, zipcode,
                  clinic, license_number, aadhar_card,
                  experience, degree, university, specialization,
                  availability, from_time, to_time, additional_info,
                  password, profile_image_url)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                  `;

      const values = [ uid, first_name, last_name, email,mobile, door_no, area,city,state, country,zipcode, clinic, license_number,aadhar_card,experience,degree,university, specialization,availability,from_time, to_time,additional_info,password,profileImagePath];
      
      db.query(sql, values, (err, result) => {
          if (err) {
              console.error(err);
              return res.status(500).json({ message: "Error inserting doctor." });
          }

          res.status(201).json({ message: "Doctor registered successfully", uid });
      });
  });
});

// ==================== DOCTOR LOGIN ====================
router.post("/doctorlogin", (req, res) => {

  const { email, password } = req.body;

  console.log("🔐 Login request:", email);

  db.query(
    "SELECT * FROM doctors WHERE email = ?",
    [email],
    (err, results) => {

      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ message: "Database error!" });
      }

      if (results.length === 0) {
        console.log("❌ Doctor not found:", email);
        return res.status(404).json({ message: "Doctor not found!" });
      }

      const doctor = results[0];

      if (doctor.password !== password) {
        console.log("❌ Invalid password:", email);
        return res.status(401).json({ message: "Invalid credentials!" });
      }

      console.log("✅ Doctor authenticated:", doctor.uid);

      // UPDATE ONLINE STATUS
      db.query(
        "UPDATE doctors SET is_online = 1 WHERE uid = ?",
        [doctor.uid],
        (updateErr, updateResult) => {

          if (updateErr) {
            console.error("❌ Online update error:", updateErr);
            return res.status(500).json({ message: "Failed to update status" });
          }

          console.log("🟢 Online status updated");
          console.log("Rows affected:", updateResult.affectedRows);

          // Check the value
          db.query(
            "SELECT is_online FROM doctors WHERE uid = ?",
            [doctor.uid],
            (err2, result2) => {

              if (!err2 && result2.length > 0) {
                console.log("Current is_online:", result2[0].is_online);
              }

              return res.status(200).json({
                message: "Login successful",
                uid: doctor.uid,
                doctor: {
                  name: doctor.first_name + " " + doctor.last_name,
                  email: doctor.email,
                  specialization: doctor.specialization
                }
              });

            }
          );

        }
      );

    }
  );

});

// Get Online Doctors for Instant Consultation (new endpoint)
router.get("/online-doctors",(req,res)=>{

let { specialization } = req.query;

let sql = `SELECT uid,first_name,last_name,specialization, consultation_fee,profile_image_url,area,city FROM doctors WHERE is_online = 1 AND instant_consultation = TRUE `;

const params = [];

if(specialization){
sql += " AND specialization = ?";
params.push(specialization);
}

db.query(sql,params,(err,results)=>{
if(err) return res.status(500).json({error:"db error"});
res.json(results);
});

});

// ==================== APPOINTMENT BOOKING ====================

// POST: Book a time slot (from eyedoctors.js)
router.post('/bookSlot', (req, res) => {
  const {
    doctorId,
    doctorUid,
    slot,
    date = new Date().toISOString().split('T')[0],
    patientName = 'Anonymous'
  } = req.body;

  const sql = `INSERT INTO appointments (doctor_id, doctor_uid, slot_time, slot_date, patient_name)
               VALUES (?, ?, ?, ?, ?)`;

  db.query(sql, [doctorId, doctorUid, slot, date, patientName], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Slot already booked.' });
      }
      console.error('Booking Error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    res.json({ message: 'Slot booked successfully!' });
  });
});

// GET BOOKED SLOTS by doctorUid + date (merged - uses appointment_time)
router.get("/getBookedSlots", (req, res) => {
  const { doctorUid, date } = req.query;
  if (!doctorUid || !date) {
    return res.status(400).json({ error: "Doctor UID and date are required." });
  }

  const sql = `
    SELECT a.appointment_time
    FROM appointments a
    WHERE a.doctor_uid = ? AND a.appointment_date = ?
    ORDER BY a.appointment_time
  `;

  db.query(sql, [doctorUid, date], (err, results) => {
    if (err) {
      console.error("Error fetching booked slots:", err);
      return res.status(500).json({ error: "Database query failed" });
    }
    const bookedSlots = results.map(row => row.appointment_time);
    res.status(200).json(bookedSlots);
  });
});

// ==================== FILTERS & SEARCH ====================

// Get Filters (Specialization, Clinics, Locations) (from eyedoctors.js)
router.get("/getfilters", (req, res) => {
    const filters = {
        specialization: [],
        clinic: [],
        city: []
    };

    db.query("SELECT DISTINCT specialization FROM doctors", (err, specResults) => {
        if (err) return res.status(500).send(err);
        filters.specialization = specResults.map(r => r.specialization);

        db.query("SELECT DISTINCT clinic FROM doctors", (err, clinicResults) => {
            if (err) return res.status(500).send(err);
            filters.clinic = clinicResults.map(r => r.clinic);

            db.query("SELECT DISTINCT city FROM doctors", (err, locResults) => {
                if (err) return res.status(500).send(err);
                filters.city = locResults.map(r => r.city);
                res.json(filters);
            });
        });
    });
});

// Get Doctor Specializations for Search Suggestions (from doctor.js)
router.get("/specializations", (req, res) => {
    const query = req.query.q || '';
    if (!query) {
        return res.json([]);
    }

    const sql = "SELECT DISTINCT specialization FROM doctors WHERE specialization LIKE ? LIMIT 10";
    const searchTerm = `${query}%`;

    db.query(sql, [searchTerm], (err, results) => {
        if (err) {
            console.error("Error fetching specializations:", err);
            return res.status(500).json({ error: "Database query failed" });
        }
        const specializations = results.map(row => row.specialization);
        res.status(200).json(specializations);
    });
});

// ==================== GET DOCTORS ====================

// Get All Doctors (merged - includes uid from both files)
router.get("/getdoctors", (req, res) => {
    const sql = `
        SELECT 
            id, 
            uid, 
            first_name, 
            last_name, 
            email, 
            mobile,
            experience, 
            specialization, 
            clinic,

            door_no, 
            area, 
            city, 
            state, 
            country, 
            zipcode,

            CONCAT(
                COALESCE(door_no, ''), ', ',
                COALESCE(area, ''), ', ',
                COALESCE(city, ''), ', ',
                COALESCE(state, ''), ', ',
                COALESCE(country, ''), ' - ',
                COALESCE(zipcode, '')
            ) AS address,

            degree, 
            university, 
            availability, 
            from_time, 
            to_time, 
            profile_image_url

        FROM doctors
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error fetching doctors:", err);
            return res.status(500).json({ error: "Database query failed" });
        }
        res.status(200).json(results);
    });
});

// Get all countries
router.get("/doctor-countries", (req, res) => {

  const sql = `
    SELECT DISTINCT country
    FROM doctors
    WHERE country IS NOT NULL
    ORDER BY country
  `;

  db.query(sql, (err, results) => {

    if (err) {
      console.error("Country query error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json(results);

  });

});

// Get states by country
router.get("/doctor-states", (req, res) => {

  const { country } = req.query;

  let sql = `
    SELECT DISTINCT state
    FROM doctors
    WHERE 1=1
  `;

  const params = [];

  if (country) {
    sql += " AND country = ?";
    params.push(country);
  }

  sql += " ORDER BY state";

  db.query(sql, params, (err, results) => {

    if (err) {
      console.error("State query error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json(results);

  });

});

// Get zipcodes by state
router.get("/doctor-zipcodes", (req, res) => {

  const { country, state } = req.query;

  let sql = `
    SELECT DISTINCT zipcode
    FROM doctors
    WHERE 1=1
  `;

  const params = [];

  if (country) {
    sql += " AND country = ?";
    params.push(country);
  }

  if (state) {
    sql += " AND state = ?";
    params.push(state);
  }

  sql += " ORDER BY zipcode";

  db.query(sql, params, (err, results) => {

    if (err) {
      console.error("Zipcode query error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json(results);

  });

});

// Get Doctor Areas with Count (merged - includes filters for country, state, zipcode)
router.get("/doctor-areas", (req, res) => {

  const { country, state, zipcode } = req.query;

  let sql = `
    SELECT area, COUNT(*) as doctor_count
    FROM doctors
    WHERE 1=1
  `;

  const params = [];

  if (country) {
    sql += " AND country = ?";
    params.push(country);
  }

  if (state) {
    sql += " AND state = ?";
    params.push(state);
  }

  if (zipcode) {
    sql += " AND zipcode LIKE ?";
    params.push(`${zipcode}%`);
  }

  sql += `
    GROUP BY area
    ORDER BY doctor_count DESC
  `;

  db.query(sql, params, (err, results) => {

    if (err) {
      console.error("Area query error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json(results);

  });

});

// Search Doctors by Location (merged - includes filters for country, state, zipcode, area)
router.get("/doctors/search", (req, res) => {

  const { country, state, zipcode, area } = req.query;

  let sql = `
    SELECT id, uid, first_name, last_name, specialization, clinic,
           door_no, area, city, state, country, zipcode
    FROM doctors
    WHERE 1=1
  `;

  const params = [];

  if (country) {
    sql += " AND country = ?";
    params.push(country);
  }

  if (state) {
    sql += " AND state = ?";
    params.push(state);
  }

  if (zipcode) {
    sql += " AND zipcode LIKE ?";
    params.push(`${zipcode}%`);
  }

  if (area) {
    sql += " AND area = ?";
    params.push(area);
  }

  db.query(sql, params, (err, results) => {

    if (err) {
      console.error("Doctor search error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json(results);

  });

});

// Get Doctor by UID (merged - simpler version)
router.get("/gdoctors/:uid", (req, res) => {
  const { uid } = req.params;
  db.query("SELECT * FROM doctors WHERE uid = ?", [uid], (err, rows) => {
    if (err) return res.status(500).json({ message: "Server error!" });
    if (rows.length === 0) return res.status(404).json({ message: "Doctor not found!" });
    res.status(200).json(rows[0]);
  });
});

// ==================== DOCTOR STATS & APPOINTMENTS ====================

// Get Doctor Stats (from doctor.js)
router.get("/doctors/:uid/stats", (req, res) => {
    const { uid } = req.params;
    const today = new Date().toISOString().slice(0, 10);

    const queries = {
        today: `SELECT COUNT(*) as count FROM appointments WHERE doctor_uid = ? AND appointment_date = ?`,
        completed: `SELECT COUNT(*) as count FROM appointments WHERE doctor_uid = ? AND status = 'Completed'`,
        pending: `SELECT COUNT(*) as count FROM appointments WHERE doctor_uid = ? AND status = 'Pending' AND appointment_date >= ?`
    };

    const stats = {};
    db.query(queries.today, [uid, today], (err, todayRes) => {
        if (err) return res.status(500).json({ success: false, error: 'DB error' });
        stats.today = todayRes[0].count;

        db.query(queries.completed, [uid], (err, completedRes) => {
            if (err) return res.status(500).json({ success: false, error: 'DB error' });
            stats.completed = completedRes[0].count;

            db.query(queries.pending, [uid, today], (err, pendingRes) => {
                if (err) return res.status(500).json({ success: false, error: 'DB error' });
                stats.pending = pendingRes[0].count;
                res.json({ success: true, stats });
            });
        });
    });
});

// Get Doctor Appointments (from doctor.js)
router.get("/doctors/:uid/appointments", (req, res) => {
    const { uid } = req.params;
    const sql = `
        SELECT 
            p.name as patient_name,
            p.email as patient_email,
            a.patient_id,
            a.mode,
            a.appointment_date as date,
            a.appointment_time as time,
            a.payment_status
        FROM appointments a
        JOIN patients p ON a.patient_id = p.patient_id
        WHERE a.doctor_uid = ? AND a.status = 'Pending'
        ORDER BY a.appointment_date, a.appointment_time;
    `;
    db.query(sql, [uid], (err, results) => {
        if (err) {
            console.error("Error fetching appointments:", err);
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        res.json({ success: true, appointments: results });
    });
});

// Get Doctor Treatment History (from doctor.js)
router.get("/doctors/:uid/history", (req, res) => {
    const { uid } = req.params;
    const sql = `
        SELECT 
            p.name as patient_name,
            p.email as patient_email,
            a.patient_id,
            a.appointment_date as last_visit_date,
            a.status
        FROM appointments a
        JOIN patients p ON a.patient_id = p.patient_id
        WHERE a.doctor_uid = ? AND a.status = 'Completed'
        ORDER BY a.appointment_date DESC;
    `;
    db.query(sql, [uid], (err, results) => {
        if (err) {
            console.error("Error fetching history:", err);
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        res.json({ success: true, history: results });
    });
});

// ==================== UPDATE DOCTOR ====================

// Update Doctor Profile (merged - includes all fields from both files)
router.put("/updatedoctors/:uid", upload.single('profile_image'), (req, res) => {
  const { uid } = req.params;
  let {
    first_name, last_name, email, mobile, door_no, area, city, state, country, zipcode, clinic, license_number,
    aadhar_card, experience, degree, university, specialization,
    availability, from_time, to_time, additional_info
  } = req.body;
  specialization = specialization ? specialization.trim().toUpperCase() : null;

  let profileImagePath = null;
  if (req.file) {
    profileImagePath = `/uploads/doctor_profiles/${req.file.filename}`;
  }

  const sql = `UPDATE doctors SET 
    first_name = ?, last_name = ?, email = ?, mobile = ?, door_no = ?, area = ?, city = ?, state = ?, country = ?, zipcode = ?, clinic = ?, 
    license_number = ?, aadhar_card = ?, experience = ?, degree = ?, university = ?, 
    specialization = ?, availability = ?, from_time = ?, to_time = ?, additional_info = ?,
    profile_image_url = COALESCE(?, profile_image_url)
    WHERE uid = ?`;

  const values = [
    first_name, last_name, email, mobile, door_no, area, city, state, country, zipcode, clinic, license_number,
    aadhar_card, experience, degree, university, specialization,
    availability, from_time, to_time, additional_info,
    profileImagePath,
    uid
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
        console.error("Update error:", err);
        return res.status(500).json({ success: false, message: "Failed to update doctor details." });
    }
    if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: "Doctor not found!" });
    }
    
    db.query("SELECT * FROM doctors WHERE uid = ?", [uid], (err, rows) => {
        if (err || rows.length === 0) {
            return res.status(500).json({ success: false, message: "Could not retrieve updated profile." });
        }
        res.status(200).json({ 
            success: true, 
            message: "Doctor updated successfully!",
            updatedDoctor: rows[0] 
        });
    });
  });
});

// ==================== DELETE DOCTOR ====================

// Delete Doctor (from eyedoctors.js)
router.delete("/deletedoctors/:uid", (req, res) => {
    const { uid } = req.params;

    db.query("DELETE FROM doctors WHERE uid = ?", [uid], (err, result) => {
        if (err) {
            console.error("Error:", err);
            return res.status(500).json({ message: "Server error!" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Doctor not found!" });
        }

        res.status(200).json({ message: "Doctor deleted successfully!" });
    });
});

// ==================== DOCTOR LOGOUT ====================
router.post("/doctor-logout", (req,res)=>{

const { uid } = req.body;

db.query(
"UPDATE doctors SET is_online = 0 WHERE uid = ?",
[uid],
(err)=>{

if(err){
console.error(err);
return res.status(500).json({message:"error"});
}

res.json({message:"Doctor offline"});

});

});

module.exports = router;