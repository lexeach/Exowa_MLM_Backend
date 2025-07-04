const mysql = require('mysql2');
require('dotenv').config();

const NODE_ENV = process.env.NODE_ENV;

// Function to establish a MySQL connection
function connectToMySQL() {
    const connection = mysql.createConnection({
        host: NODE_ENV == "development" ? "148.135.137.202" : process.env.MAIN_HOST,
        user: NODE_ENV == "development" ? "root_DoWin" : process.env.MAIN_USER,
        password: NODE_ENV == "development" ? "58cHLCep0nuBaUm9" : process.env.MAIN_PASS,
        database: NODE_ENV == "development" ? "AUTASIS" : process.env.MAIN_NAME,
    });

    // const connection = mysql.createConnection({
    //     host: 'localhost',
    //     user: 'root',
    //     password: "",
    //     database: 'DoWin',
    // });


    connection.connect(err => {
        if (err) {
            console.error('Error connecting to MySQL:', err);
            // Attempt to reconnect after a delay
            setTimeout(connectToMySQL, 2000); // Retry connection after 2 seconds
        } else {
            console.log('Connected to MySQL');
        }
    });

    // Handle MySQL connection errors
    connection.on('error', err => {
        console.error('MySQL error:', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            // Connection to MySQL server is lost, attempt to reconnect
            connectToMySQL();
        } else {
            throw err;
        }
    });

    return connection;
}

// Start MySQL connection
// const con = connectToMySQL().promise();

///----------------- Create the pool (no need for separate connection)-----------------
const pool = mysql.createPool({
    host: NODE_ENV == "development" ? "148.135.137.202" : process.env.MAIN_HOST,
    user: NODE_ENV == "development" ? "root_DoWin" : process.env.MAIN_USER,
    password: NODE_ENV == "development" ? "58cHLCep0nuBaUm9" : process.env.MAIN_PASS,
    database: NODE_ENV == "development" ? "AUTASIS" : process.env.MAIN_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}).promise(); // Add .promise() here to enable promise-based API

// Test the connection
pool.getConnection()
    .then(connection => {
        console.log('Connected to MySQL');
        connection.release();
    })
    .catch(err => {
        console.error('Error connecting to MySQL:', err);
    });


module.exports = { pool };
// module.exports = { con, pool };