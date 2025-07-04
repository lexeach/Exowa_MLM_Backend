const { pool } = require("../dbConnection/index");


exports.createOtp = () => {
    let otp;
    do {
        otp = Math.floor(100000 + Math.random() * 900000);
    } while (otp.toString().length !== 6);
    return 123456;
};

// exports.createUserId = async () => {
//     let userid, exists;
//     do {
//         // userid = 'AUTASIS' + Math.floor(Math.random() * (999999 - 10 + 1)) + 100;
//         // const randomPart = Math.floor(Math.random() * (9999999 - 1000000 + 1)) + 1000000;
//         const randomPart = Math.floor(100000000 + Math.random() * 900000000);

//         // Append '100' as a string (no parseInt)
//         userid = `${randomPart}100`; // e.g., "56341278100"
//         const [rows] = await pool.query('SELECT 1 FROM user WHERE userid = ?', [userid]);
//         exists = rows.length > 0;
//     } while (exists);
//     return userid;
// };

exports.createUserId = async () => {
    let userid, exists;
    do {
        // userid = 'AUTASIS' + Math.floor(Math.random() * (999999 - 10 + 1)) + 100;
        // const randomPart = Math.floor(Math.random() * (9999999 - 1000000 + 1)) + 1000000;
        const randomPart = Math.floor(100000000 + Math.random() * 900000000);

        userid = parseInt(randomPart.toString() + '100');
        const [rows] = await pool.query('SELECT 1 FROM user WHERE userid = ?', [userid]);
        exists = rows.length > 0;
    } while (exists);
    return userid;
};

exports.createAdminId = async () => {
    let admin_id, exists;
    do {
        // userid = 'AUTASIS' + Math.floor(Math.random() * (999999 - 10 + 1)) + 100;
        // const randomPart = Math.floor(Math.random() * (99999999 - 10000000 + 1)) + 10000000;
        const randomPart = Math.floor(10000000 + Math.random() * 90000000);

        admin_id = parseInt(randomPart.toString() + '1000');
        const [rows] = await pool.query('SELECT 1 FROM admin_register WHERE admin_id = ?', [admin_id]);
        exists = rows.length > 0;
    } while (exists);
    return admin_id;
};


exports.trx_id = async () => {
    // return 'AUTASIS_tx_' + Math.floor(Math.random() * (99999999 - 100 + 1)) + 1000;
    const timestamp = Date.now(); // current timestamp in milliseconds
    const randomNumber = Math.floor(Math.random() * 100000); // 0 to 99999
    return `${timestamp}${randomNumber}`;
};