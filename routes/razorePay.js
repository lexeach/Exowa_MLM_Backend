const router = require("express").Router();
const { pool } = require("../dbConnection/index");
require("dotenv").config();
const Razorpay = require("razorpay");
const verifyToken = require("../middleware/verifyToken");
const { trx_id } = require('../controllers/createRandomNum.js');


// Initialize Razorpay with your API keys
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID, // Replace with your actual key
    key_secret: process.env.RAZORPAY_KEY_SECRET, // Replace with your actual secret
});

router.post("/create-payment-link", verifyToken, async (req, res) => {
    const { amount, callback_url, currency = "INR" } = req.body;
    const { userid } = req.user;

    // Validate required fields
    if (!userid) return res.status(400).json({ error: "Please login first" });
    if (!amount || isNaN(amount)) return res.status(400).json({ status: false, message: "A valid numeric amount is required." });
    if (!callback_url) return res.status(400).json({ status: false, message: "callback url is required." });

    try {
        const time = Math.floor(Date.now() / 1000);
        const paymentLink = await razorpay.paymentLink.create({
            amount: amount * 100, // Convert to paise (1 INR = 100 paise)
            currency: currency,
            description: "Payment for services",
            reminder_enable: true,
            callback_url: callback_url, // Your success callback URL
            callback_method: "get",
            notes: {}, // Additional metadata if needed
        });
        // console.log(paymentLink, 'paymentLink');

        const txId = await trx_id();

        // Record transaction
        await pool.execute(
            `INSERT INTO transaction_history 
             (userid, transaction_id, transaction_type, amount, old_balance, current_balance, datetime,status,upgrade_level)
             VALUES (?, ?, 'registration', ?, ?, ?, ?,'pending',?)`,
            [userid, paymentLink.short_url, amount, 0, 0, time, 1]
        );

        res.status(200).json({
            status: true,
            payment_link_id: paymentLink.id,
            short_url: paymentLink.short_url,
            long_url: paymentLink.long_url,
        });
    } catch (err) {
        console.error("Razorpay error:", err);
        res.status(500).json({ status: false, error: err.error?.description || "Failed to create payment link" });
    }
});


module.exports = router;
