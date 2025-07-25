const fs = require('fs');
const http = require('http');
const https = require('https');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require("path");
const multer = require("multer");
const session = require('express-session');

const app = express(); // ✅ Initialize app first

// Middleware setup
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname))); // Serve static files

const upload = multer({ dest: "uploads/" }); // For file uploads

// Routes Import
const appointment_fertilityRoutes = require("./routes/appointment_fertility");
const appointmentsRoutes = require("./routes/appointments");
const bookappointmentRoutes = require("./routes/bookappointment");
const bloodRoutes = require("./routes/blood");
const clinicRoutes = require("./routes/clinicRegister");
const contactRoutes = require("./routes/contact");
const bloodtestRoutes = require("./routes/bloodtest");
const diagnosticstestsRoutes = require("./routes/diagnosticstests");
const doctorRoutes = require("./routes/doctor");
const entappointmentRoutes = require("./routes/entappointment");
const entspecialistRoutes = require("./routes/entspecialist"); // Missing in your original code — assumed
const eyedoctorsRoutes = require("./routes/eyedoctors");
const eyeformRoutes = require("./routes/eyeform");
const finddoctorRoutes = require("./routes/finddoctor");
const homesample_testRoutes = require("./routes/homesample_test");
const hr_donationsRoutes = require("./routes/hr_donations");
const hr_packagesRoutes = require("./routes/hr_packages");
const packagesRoutes = require("./routes/packages");
const patientloginRoutes = require("./routes/patientlogin");
const patientRoutes = require("./routes/patient"); // Assuming you have a patient route



app.use(session({
  secret: 'hitaishi_secure_key_123', // Use a strong secret in production
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000  // 1 day
  }
}));


// Use Routes
app.use("/api", appointment_fertilityRoutes);
app.use("/api", appointmentsRoutes);
app.use("/api", bookappointmentRoutes);
app.use("/api", bloodRoutes);
app.use("/api", clinicRoutes);
app.use("/api", contactRoutes);
app.use("/api", bloodtestRoutes);
app.use("/api", diagnosticstestsRoutes);
app.use("/api", doctorRoutes);
app.use("/api", entappointmentRoutes);
app.use("/api", entspecialistRoutes);
app.use("/api", eyedoctorsRoutes);
app.use("/api", eyeformRoutes);
app.use("/api", finddoctorRoutes);
app.use("/api", homesample_testRoutes);
app.use("/api", hr_donationsRoutes);
app.use("/api", hr_packagesRoutes);
app.use("/api", packagesRoutes);
app.use("/api", patientloginRoutes);
app.use("/api", patientRoutes);


// app.use(express.static(__dirname));
// app.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });

// app.get('/payment', (req, res) => {
//   res.sendFile(path.join(__dirname, 'payment.html'));
// });
// app.get('/blood', (req, res) => {
//   res.sendFile(path.join(__dirname, 'blood.html'));
// });
// app.get("/bookappointments", (req, res) => {
//   res.sendFile(path.join(__dirname, "bookappointments.html"));
// });

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server is running on port ${PORT}...`);
});


// 🔐 HTTPS SSL certificate paths (from Certbot)
const sslOptions = {
  key: fs.readFileSync('/etc/letsencrypt/live/hitaishihealthcare.com/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/hitaishihealthcare.com/fullchain.pem')
};

// ✅ Start HTTPS server on port 443
https.createServer(sslOptions, app).listen(443, () => {
  console.log("✅ Secure HTTPS server running on port 443");
});

// 🔁 Redirect HTTP → HTTPS
http.createServer((req, res) => {
  res.writeHead(301, { Location: 'https://' + req.headers.host + req.url });
  res.end();
}).listen(80, () => {
  console.log("🌐 Redirecting all HTTP to HTTPS on port 80");
});



