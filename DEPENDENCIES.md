// package.json dependencies for Fertility Center Registration

// Add these to your existing package.json under "dependencies"

{
  "dependencies": {
    "express": "^4.18.0",
    "express-validator": "^7.0.0",
    "bcrypt": "^5.1.0",
    "nodemailer": "^6.9.0",
    "express-fileupload": "^1.4.0",
    "mysql2": "^3.6.0",
    "dotenv": "^16.0.0",
    "cors": "^2.8.5",
    "express-session": "^1.17.3",
    "socket.io": "^4.5.4"
  },
  "devDependencies": {
    "nodemon": "^2.0.20"
  }
}

// Installation Command:
// npm install express-validator bcrypt nodemailer express-fileupload

// Detailed Package Info:

/**
 * express-validator: ^7.0.0
 * - Input validation middleware for Express
 * - Used for form validation in registration
 * - https://express-validator.github.io/docs/
 */

/**
 * bcrypt: ^5.1.0
 * - Password hashing library
 * - Used for secure password storage
 * - 10 salt rounds for production
 * - https://www.npmjs.com/package/bcrypt
 */

/**
 * nodemailer: ^6.9.0
 * - Email sending library for Node.js
 * - Configured for Zoho SMTP
 * - Supports HTML emails with templates
 * - https://nodemailer.com/
 */

/**
 * express-fileupload: ^1.4.0
 * - File upload middleware
 * - Handles multipart/form-data
 * - Supports temporary file handling
 * - https://www.npmjs.com/package/express-fileupload
 */

/**
 * mysql2: ^3.6.0
 * - MySQL database driver for Node.js
 * - Already in your project
 * - Supports promises and connection pooling
 * - https://www.npmjs.com/package/mysql2
 */
