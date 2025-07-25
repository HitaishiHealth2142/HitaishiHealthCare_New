const express = require("express");
const router = express.Router();
const db = require("../db");
const multer = require("multer");
const crypto = require("crypto");
const upload = multer(); // handles form-data without files



// Create the doctors table if it doesn't exist
const createDoctorsTable = `
  CREATE TABLE IF NOT EXISTS doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uid VARCHAR(10) UNIQUE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(100),
    mobile VARCHAR(20),
    address TEXT,
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
    password VARCHAR(255)
  )
`;

db.query(createDoctorsTable, (err) => {
  if (err) {
    console.error("Failed to create doctors table:", err);
  } else {
    console.log("✅ Doctors table ready (or already exists).");
  }
});


// Register Doctor
router.post("/doctors", upload.none(), async (req, res) => {
    const {
        first_name, last_name, email, mobile, address, clinic, license_number,
        aadhar_card, experience, degree, university, specialization,
        availability, from_time, to_time, additional_info, password
    } = req.body;

    const uid = crypto.randomBytes(3).toString("hex"); // Generate 6-char UID

    // Check for duplicate Aadhar
    db.query("SELECT * FROM doctors WHERE aadhar_card = ?", [aadhar_card], (err, results) => {
        if (err) return res.status(500).json({ message: "Error checking Aadhar." });

        if (results.length > 0) {
            return res.status(400).json({ message: "Aadhar already registered." });
        }

        // If not duplicate, insert into DB
        const sql = `INSERT INTO doctors 
            (uid, first_name, last_name, email, mobile, address, clinic, license_number, aadhar_card,
            experience, degree, university, specialization, availability, from_time, to_time, additional_info, password) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const values = [
            uid, first_name, last_name, email, mobile, address, clinic, license_number, aadhar_card,
            experience, degree, university, specialization, availability, from_time, to_time, additional_info, password
        ];

        db.query(sql, values, (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Error inserting doctor." });
            }

            res.status(201).json({ message: "Doctor registered successfully", uid });
        });
    });
});

// Doctor Login
router.post("/doctorlogin", async (req, res) => {
    const { email, password } = req.body;

    db.query("SELECT * FROM doctors WHERE email = ?", [email], (err, results) => {
        if (err) return res.status(500).json({ message: "Database error!" });

        if (results.length === 0) {
            return res.status(404).json({ message: "Doctor not found!" });
        }

        const doctor = results[0];
            if (doctor.password !== password) {
                return res.status(401).json({ message: "Invalid credentials!" });
            }

        // ✅ Save doctor info in session
            req.session.user = {
                role: 'doctor',
                uid: doctor.uid,
                email: doctor.email,
                name: doctor.first_name + " " + doctor.last_name
            };

            res.status(200).json({
                message: "Login successful",
                user: req.session.user
            });
    });
});

// Get Filters (Specialization, Clinics, Locations)
router.get("/getfilters", (req, res) => {
    const filters = {
        specialization: [],
        clinic: [],
        address: []
    };

    db.query("SELECT DISTINCT specialization FROM doctors", (err, specResults) => {
        if (err) return res.status(500).send(err);
        filters.specialization = specResults.map(r => r.specialization);

        db.query("SELECT DISTINCT clinic FROM doctors", (err, clinicResults) => {
            if (err) return res.status(500).send(err);
            filters.clinic = clinicResults.map(r => r.clinic);

            db.query("SELECT DISTINCT address FROM doctors", (err, locResults) => {
                if (err) return res.status(500).send(err);
                filters.address = locResults.map(r => r.address);
                res.json(filters); // Final response after all three queries
            });
        });
    });
});

// Get All Doctors
router.get("/getdoctors", (req, res) => {
    db.query("SELECT * FROM doctors", (err, rows) => {
        if (err) {
            console.error("Error:", err);
            return res.status(500).json({ message: "Server error!" });
        }
        res.status(200).json(rows);
    });
});

// Get Doctor by UID
router.get("/gdoctors/:uid", (req, res) => {
    const { uid } = req.params;

    db.query("SELECT * FROM doctors WHERE uid = ?", [uid], (err, rows) => {
        if (err) {
            console.error("Error:", err);
            return res.status(500).json({ message: "Server error!" });
        }

        if (rows.length === 0) {
            return res.status(404).json({ message: "Doctor not found!" });
        }

        res.status(200).json(rows[0]);
    });
});

// Fetch Doctor Details from session
router.get("/doctor-profile", (req, res) => {
    if (req.session.user && req.session.user.role === 'doctor') {
        const uid = req.session.user.uid;
        db.query("SELECT * FROM doctors WHERE uid = ?", [uid], (err, results) => {
            if (err) {
                console.error("Error fetching doctor profile:", err);
                return res.status(500).json({ message: "Server error" });
            }
            if (results.length > 0) {
                const doctor = results[0];
                res.status(200).json({
                    uid: doctor.uid,
                    first_name: doctor.first_name,
                    last_name: doctor.last_name,
                    email: doctor.email,
                    mobile: doctor.mobile,
                    address: doctor.address,
                    clinic: doctor.clinic,
                    license_number: doctor.license_number,
                    aadhar_card: doctor.aadhar_card,
                    experience: doctor.experience,
                    degree: doctor.degree,
                    university: doctor.university,
                    specialization: doctor.specialization,
                    availability: doctor.availability,
                    from_time: doctor.from_time,
                    to_time: doctor.to_time,
                    additional_info: doctor.additional_info,
                });
            } else {
                res.status(404).json({ message: "Doctor not found" });
            }
        });
    } else {
        res.status(401).json({ message: "Unauthorized" });
    }
});


// Update Doctor
router.put("/updatedoctors/:uid", (req, res) => {
    const { uid } = req.params;
    const {
        first_name, last_name, email, mobile, address, clinic, license_number,
        aadhar_card, experience, degree, university, specialization,
        availability, from_time, to_time, additional_info
    } = req.body;

    const sql = `UPDATE doctors SET 
        first_name = ?, last_name = ?, email = ?, mobile = ?, address = ?, clinic = ?, 
        license_number = ?, aadhar_card = ?, experience = ?, degree = ?, university = ?, 
        specialization = ?, availability = ?, from_time = ?, to_time = ?, additional_info = ? 
        WHERE uid = ?`;

    db.query(sql, [
        first_name, last_name, email, mobile, address, clinic, license_number,
        aadhar_card, experience, degree, university, specialization,
        availability, from_time, to_time, additional_info, uid
    ], (err, result) => {
        if (err) {
            console.error("Error:", err);
            return res.status(500).json({ message: "Server error!" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Doctor not found!" });
        }

        res.status(200).json({ message: "Doctor details updated successfully!" });
    });
});

// Delete Doctor
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

// Check Doctor Session
router.get("/doctor-session", (req, res) => {
    if (req.session.user && req.session.user.role === 'doctor') {
        res.json({ loggedIn: true, user: req.session.user });
    } else {
        res.json({ loggedIn: false });
    }
});

// Doctor Logout
router.post("/doctorlogout", (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: "Logout failed!" });
        }
        res.clearCookie('connect.sid'); // optional, clear session cookie
        res.json({ message: "Logged out successfully" });
    });
});


module.exports = router;