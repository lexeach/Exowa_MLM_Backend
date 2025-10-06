const express = require('express');
const http = require('http');
const https = require('https');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const app = express();
let server;
require('dotenv').config();
// DB IMPORT
require('./dbConnection/index');
// require('./controllers/scheduler');
app.use(express.json());
app.use(express.static('public'));
app.use('/api', express.static(__dirname + '/templates'));
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
const corsOptions = {
    origin: "*",
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    exposedHeaders: ['x-auth-token']
};
app.use(cors(corsOptions));
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});

// API routes
app.use('/api/user', require('./routes/users'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api', require('./routes/razorePay'));
app.use('/api/website', require('./routes/website'));

// Error handling middleware
app.use((err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.message = err.message || "Internal Server Error";
    res.status(err.statusCode).json({ message: err.message });
});
/* if (process.env.NODE_ENV === "production") {
    var privateKey = fs.readFileSync('/root/apic_myreview_website/apic_myreview_website.key', 'utf-8');
    var certificate = fs.readFileSync('/root/apic_myreview_website/apic_myreview_website.crt', 'utf-8');
    var ca = fs.readFileSync('/root/apic_myreview_website/apic_myreview_website.ca-bundle', 'utf-8');
    const credentials = { key: privateKey, cert: certificate, ca: ca };
    server = https.createServer(credentials, app);
    console.log(`Secure server running on port ${process.env.SECURE_PORT}`);
} else { */
    server = http.createServer(app);
    console.log(`Server running on port ${process.env.PORT}`);
//}
const port = process.env.NODE_ENV === "production" ? process.env.SECURE_PORT : process.env.PORT;
server.listen(port, () => {
    console.log(`Server is listening on ${process.env.NODE_ENV === "production" ? 'https' : 'http'}://localhost:${port}`);
});
