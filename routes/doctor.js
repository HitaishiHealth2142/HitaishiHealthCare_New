const express = require("express");
const router = express.Router();
const db = require("../db"); // Assuming this points to your database connection
const multer = require("multer");
const crypto = require("crypto"); // For generating unique IDs

const upload = multer(); // Configures multer to handle form-data (without file uploads for these routes)

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

// Execute the table creation query
db.query(createDoctorsTable, (err) => {
  if (err) {
    console.error("Failed to create doctors table:", err);
  } else {
    console.log("✅ Doctors table ready (or already exists).");
  }
});


// API Route: Register a new Doctor
router.post("/doctors", upload.none(), async (req, res) => {
    const {
        first_name, last_name, email, mobile, address, clinic, license_number,
        aadhar_card, experience, degree, university, specialization,
        availability, from_time, to_time, additional_info, password
    } = req.body;

    // Generate a unique 6-character UID for the doctor
    const uid = crypto.randomBytes(3).toString("hex");

    // Check if Aadhar card is already registered to prevent duplicates
    db.query("SELECT * FROM doctors WHERE aadhar_card = ?", [aadhar_card], (err, results) => {
        if (err) {
            console.error("Database error during Aadhar check:", err);
            return res.status(500).json({ message: "Error checking Aadhar." });
        }

        if (results.length > 0) {
            return res.status(400).json({ message: "Aadhar already registered. Please use a different Aadhar card." });
        }

        // If Aadhar is unique, insert the new doctor's details into the database
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
                console.error("Error inserting doctor into database:", err);
                return res.status(500).json({ message: "Error registering doctor. Please try again." });
            }

            // Respond with success message and the generated UID
            res.status(201).json({ message: "Doctor registered successfully!", uid });
        });
    });
});

// API Route: Doctor Login
router.post("/doctorlogin", async (req, res) => {
    const { email, password } = req.body;

    // Find the doctor by email in the database
    db.query("SELECT * FROM doctors WHERE email = ?", [email], (err, results) => {
        if (err) {
            console.error("Database error during doctor login:", err);
            return res.status(500).json({ message: "Database error during login!" });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: "Doctor not found with this email." });
        }

        const doctor = results[0];
        // Compare the provided password with the stored password (in a real app, use hashed passwords)
        if (doctor.password !== password) {
            return res.status(401).json({ message: "Invalid credentials! Please check your password." });
        }

        // ✅ If credentials are valid, save doctor information in the session
        // This session will be used to identify the logged-in doctor across requests
        req.session.user = {
            role: 'doctor', // Role helps distinguish between different user types
            uid: doctor.uid,
            email: doctor.email,
            name: `${doctor.first_name} ${doctor.last_name}` // Full name for display
        };

        // Respond with success message and user details
        res.status(200).json({
            message: "Login successful",
            user: req.session.user
        });
    });
});

// API Route: Get Filters (Specialization, Clinics, Locations) - for search/filter functionality
router.get("/getfilters", (req, res) => {
    const filters = {
        specialization: [],
        clinic: [],
        address: []
    };

    // Fetch distinct specializations
    db.query("SELECT DISTINCT specialization FROM doctors", (err, specResults) => {
        if (err) {
            console.error("Error fetching specializations:", err);
            return res.status(500).json({ message: "Server error fetching specializations!" });
        }
        filters.specialization = specResults.map(r => r.specialization).filter(Boolean); // Filter out null/empty

        // Fetch distinct clinics
        db.query("SELECT DISTINCT clinic FROM doctors", (err, clinicResults) => {
            if (err) {
                console.error("Error fetching clinics:", err);
                return res.status(500).json({ message: "Server error fetching clinics!" });
            }
            filters.clinic = clinicResults.map(r => r.clinic).filter(Boolean);

            // Fetch distinct addresses
            db.query("SELECT DISTINCT address FROM doctors", (err, locResults) => {
                if (err) {
                    console.error("Error fetching addresses:", err);
                    return res.status(500).json({ message: "Server error fetching addresses!" });
                }
                filters.address = locResults.map(r => r.address).filter(Boolean);
                res.json(filters); // Send all filters as a single JSON response
            });
        });
    });
});

// API Route: Get All Doctors
router.get("/getdoctors", (req, res) => {
    db.query("SELECT * FROM doctors", (err, rows) => {
        if (err) {
            console.error("Error fetching all doctors:", err);
            return res.status(500).json({ message: "Server error fetching doctors!" });
        }
        res.status(200).json(rows);
    });
});

// API Route: Get Doctor by UID
router.get("/gdoctors/:uid", (req, res) => {
    const { uid } = req.params; // Extract UID from URL parameters

    db.query("SELECT * FROM doctors WHERE uid = ?", [uid], (err, rows) => {
        if (err) {
            console.error("Error fetching doctor by UID:", err);
            return res.status(500).json({ message: "Server error!" });
        }

        if (rows.length === 0) {
            return res.status(404).json({ message: "Doctor not found with the provided UID!" });
        }

        res.status(200).json(rows[0]); // Return the first (and only) doctor found
    });
});

// API Route: Fetch Doctor Details from session (for profile page)
router.get("/doctor-profile", (req, res) => {
    // Check if a doctor is logged in via session
    if (req.session.user && req.session.user.role === 'doctor') {
        const uid = req.session.user.uid; // Get UID from session
        db.query("SELECT * FROM doctors WHERE uid = ?", [uid], (err, results) => {
            if (err) {
                console.error("Error fetching doctor profile from DB:", err);
                return res.status(500).json({ message: "Server error fetching doctor profile" });
            }
            if (results.length > 0) {
                const doctor = results[0];
                // Return specific doctor details, excluding sensitive info like password
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
                res.status(404).json({ message: "Doctor profile not found in database." });
            }
        });
    } else {
        res.status(401).json({ message: "Unauthorized. Please log in as a doctor." });
    }
});


// API Route: Update Doctor Profile
router.put("/updatedoctors/:uid", (req, res) => {
    const { uid } = req.params; // Doctor UID from URL
    const {
        first_name, last_name, email, mobile, address, clinic, license_number,
        aadhar_card, experience, degree, university, specialization,
        availability, from_time, to_time, additional_info
    } = req.body; // Updated data from request body

    // SQL query to update doctor details
    const sql = `UPDATE doctors SET 
        first_name = ?, last_name = ?, email = ?, mobile = ?, address = ?, clinic = ?, 
        license_number = ?, aadhar_card = ?, experience = ?, degree = ?, university = ?, 
        specialization = ?, availability = ?, from_time = ?, to_time = ?, additional_info = ? 
        WHERE uid = ?`;

    const values = [
        first_name, last_name, email, mobile, address, clinic, license_number,
        aadhar_card, experience, degree, university, specialization,
        availability, from_time, to_time, additional_info, uid
    ];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Error updating doctor details:", err);
            return res.status(500).json({ message: "Server error! Failed to update doctor details." });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Doctor not found or no changes made!" });
        }

        res.status(200).json({ message: "Doctor details updated successfully!" });
    });
});

// API Route: Delete Doctor
router.delete("/deletedoctors/:uid", (req, res) => {
    const { uid } = req.params; // Doctor UID to delete

    db.query("DELETE FROM doctors WHERE uid = ?", [uid], (err, result) => {
        if (err) {
            console.error("Error deleting doctor:", err);
            return res.status(500).json({ message: "Server error! Failed to delete doctor." });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Doctor not found!" });
        }

        res.status(200).json({ message: "Doctor deleted successfully!" });
    });
});

// API Route: Check Doctor Session Status
router.get("/doctor-session", (req, res) => {
    // Check if the session contains a user object and if their role is 'doctor'
    if (req.session.user && req.session.user.role === 'doctor') {
        res.json({ loggedIn: true, user: req.session.user });
    } else {
        res.json({ loggedIn: false });
    }
});

// API Route: Doctor Logout
router.post("/doctorlogout", (req, res) => {
    // Destroy the current session
    req.session.destroy(err => {
        if (err) {
            console.error("Error destroying session during logout:", err);
            return res.status(500).json({ message: "Logout failed!" });
        }
        // Optionally clear the session cookie from the client's browser
        res.clearCookie('connect.sid'); 
        res.json({ message: "Logged out successfully" });
    });
});


module.exports = router; // Export the router to be used in server.js
