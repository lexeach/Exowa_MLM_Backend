require("dotenv").config();
const Razorpay = require("razorpay");

// Initialize Razorpay with your API keys
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID, // Replace with your actual key
    key_secret: process.env.RAZORPAY_KEY_SECRET, // Replace with your actual secret
});

const verifyPaymentId = async (paymentId) => {
    try {
        const payment = await razorpay.payments.fetch(paymentId);
        return payment.status === 'captured';
    } catch (err) {
        console.log('Invalid payment', err);
    }
}




module.exports = { verifyPaymentId }
