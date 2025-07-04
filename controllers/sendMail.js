const nodemailer = require('nodemailer');
require('dotenv').config();

const sendMail = async (subject, message, email) => {
    try {
        const transporter = nodemailer.createTransport({
            host: `${process.env.host}`,
            port: 465,
            secure: true,
            auth: {
                user: `${process.env.mail}`,
                pass: `${process.env.pass}`
            },
        });
        const mailOptions = {
            from: `${process.env.mail}`,
            to: `${email}`,
            subject: subject,
            html: message,
        };
        await transporter.verify();
        transporter.sendMail(mailOptions, (err, response) => {
            if (err) {
                throw new Error('Something went wrong');
            }
        });
    } catch (err) {
        console.log(err);
    }
}

// const sendMail = async (subject, message, toEmail) => {

//     // Initialize Nodemailer transporter
//     const transporter = nodemailer.createTransport({
//         service: "Gmail",
//         auth: {
//             user: process.env.EMAIL_USER,
//             pass: process.env.EMAIL_PASSWORD,
//         },
//     });

//     // Send OTP via email
//     await transporter.sendMail({
//         from: process.env.EMAIL_USER,
//         to: toEmail,
//         subject: subject,
//         // text: html,
//         html: message,
//     });

// }

module.exports = sendMail;