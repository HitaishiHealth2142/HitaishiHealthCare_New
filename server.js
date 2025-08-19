const fs = require('fs');
const http = require('http');
// const https = require('https');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require("path"); // <-- DECLARED ONCE, CORRECTLY
const multer = require("multer");
const session = require('express-session');
const { GoogleGenerativeAI } = require('@google/generative-ai');

require('dotenv').config();

const app = express(); // ✅ Initialize app first

// Middleware setup
app.use(cors({
  origin: "https://hitaishihealthcare.com", // ✅ Replace with your frontend domain
  credentials: true                         // ✅ Allow cookies
}));


require('dotenv').config();
app.set('trust proxy', 1);

// File Upload Setup
const upload = multer({ dest: 'uploads/' });
// const path = require('path'); // <-- DUPLICATE REMOVED
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// This makes the 'uploads' folder publically accessible
app.use('/uploads', express.static('uploads'));

app.use(express.json({ limit: '50mb' }));  
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname))); // Serve static files



// Configure session middleware
app.use(require('express-session')({
  name: 'hh.sid',                 // custom cookie name
  secret: process.env.SESSION_SECRET, // << use the .env secret we generated
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: true,      // true because you’re on HTTPS
    sameSite: 'none',  // required for cross-site cookies
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));


// Routes Import - Ensure all necessary routes are imported
const appointment_fertilityRoutes = require("./routes/appointment_fertility");
const appointmentsRoutes = require("./routes/appointments");
const bookappointmentRoutes = require("./routes/bookappointment");
const bloodRoutes = require("./routes/blood");
const clinicRoutes = require("./routes/clinicRegister");
const contactRoutes = require("./routes/contact");
const bloodtestRoutes = require("./routes/bloodtest");
const diagnosticstestsRoutes = require("./routes/diagnosticstests");
const doctorRoutes = require("./routes/doctor"); // Doctor routes
const entappointmentRoutes = require("./routes/entappointment");
const entspecialistRoutes = require("./routes/entspecialist");
const eyedoctorsRoutes = require("./routes/eyedoctors");
const eyeformRoutes = require("./routes/eyeform");
const finddoctorRoutes = require("./routes/finddoctor");
const homesample_testRoutes = require("./routes/homesample_test");
const hr_donationsRoutes = require("./routes/hr_donations");
const hr_packagesRoutes = require("./routes/hr_packages");
const packagesRoutes = require("./routes/packages");
// const patientloginRoutes = require("./routes/patientlogin");
const patientRoutes = require("./routes/patient");
const diagnosticsRoutes = require("./routes/diagnostics");
const paymentRoutes = require("./routes/payment");
const testsRoutes = require("./routes/tests");
const newpaymentRoutes = require("./routes/newpayment");
const analyzeRoutes = require("./routes/analyze"); // Import the analyze route
const sessionRoutes = require("./routes/session"); // Import session routes
const unifiedLoginRoutes = require("./routes/unifiedLogin"); // Import unified login route
const unifiedPasswordResetRoutes = require("./routes/unifiedPasswordReset"); // Import unified password reset route

// Use Routes - Mount imported routes under the /api path
app.use("/api", appointment_fertilityRoutes);
app.use("/api", appointmentsRoutes);
app.use("/api", bookappointmentRoutes);
app.use("/api", bloodRoutes);
app.use("/api", clinicRoutes);
app.use("/api", contactRoutes);
app.use("/api", bloodtestRoutes);
app.use("/api", diagnosticstestsRoutes);
app.use("/api", doctorRoutes); // Doctor related APIs (login, profile, update, session check)
console.log("✅ doctorRoutes loaded at /api/");
app.use("/api" , diagnosticsRoutes)
app.use("/api", entappointmentRoutes);
app.use("/api", entspecialistRoutes);
app.use("/api", eyedoctorsRoutes);
app.use("/api", eyeformRoutes);
app.use("/api", finddoctorRoutes);
app.use("/api", homesample_testRoutes);
app.use("/api", hr_donationsRoutes);
app.use("/api", hr_packagesRoutes);
app.use("/api", packagesRoutes);
// app.use("/api", patientloginRoutes);
app.use("/api", patientRoutes);
app.use("/api", paymentRoutes);
app.use("/api", testsRoutes);
app.use("/api", newpaymentRoutes);
app.use("/api", analyzeRoutes); // Mount the analyze route
app.use('/uploads', express.static('uploads'));
app.use("/api", sessionRoutes); // Mount session management routes
console.log("✅ sessionRoutes loaded at /api/");
app.use("/api", unifiedLoginRoutes); // Mount unified login route
app.use("/api", unifiedPasswordResetRoutes); // Mount unified password reset route



// Start HTTP server for redirection (if not already handled by a reverse proxy like Nginx)
// const HTTP_PORT = 80;
const HTTPS_PORT = process.env.PORT || 5000; // Use 5000 for local development, 443 for production HTTPS

// Redirect HTTP to HTTPS
// http.createServer((req, res) => {
//   res.writeHead(301, { Location: 'https://' + req.headers.host + req.url });
//   res.end();
// }).listen(HTTP_PORT, () => {
//   console.log(`🌐 Redirecting all HTTP to HTTPS on port ${HTTP_PORT}`);
// });

// Start HTTPS server
// Ensure these paths are correct for your server environment
// const sslOptions = {
//   key: fs.readFileSync('/etc/letsencrypt/live/hitaishihealthcare.com/privkey.pem'),
//   cert: fs.readFileSync('/etc/letsencrypt/live/hitaishihealthcare.com/fullchain.pem')
// };


http.createServer(app).listen(HTTPS_PORT, '0.0.0.0', () => {
  console.log(`✅ Secure HTTPS server running on port ${HTTPS_PORT}`);
});

// Fallback for local development or if HTTPS setup is not ready
// This block will only run if the HTTPS_PORT is not 443 (e.g., 5000 for local testing)
const PORT = process.env.PORT || 5000;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
