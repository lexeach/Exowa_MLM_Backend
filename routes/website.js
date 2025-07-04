const sendMail = require("../controllers/sendMail");
const { sendNotificationToDevice, admin } = require("../pushNotification");
const kycVerification = require("../templates/adminKyc");
const kycVerificationReject = require("../templates/rejectKyc");
const router = require("express").Router();
// const con = require("../dbConnection");
const { pool } = require("../dbConnection/index");
const { isEmpty, isEmail } = require("../middleware/validation.js");
const indiaTime = new Date().toLocaleString("en-GB", { timeZone: "Asia/Kolkata", hour12: false, });
const [datePart, timePart] = indiaTime.split(', ');
const time = `${datePart.split('/').reverse().join('-')} ${timePart}`;
const support_email = process.env.support_email;
router.get("/static_data", async (req, res, next) => {
    try {
        let [terms] = await pool.execute("SELECT * FROM `apps_privacy`");
        return res.status(200).json({ result: terms });
    } catch (err) {
        next(err);
    }
});
router.get("/social_media", async (req, res, next) => {
    try {
        let [social_media] = await pool.execute("SELECT * FROM `social_media`");
        return res.status(200).json({ result: social_media });
    } catch (err) {
        next(err);
    }
});
router.post("/subscriber", async (req, res, next) => {
    const { email } = req.body;
    if (isEmpty(email)) return res.status(400).json({ error: "Please Provide email" });
    if (!isEmail(email)) return res.status(400).json({ error: "Please Provide a valid email" });
    try {
        const [subscriber] = await pool.execute("INSERT INTO `subscribe_user`(`sub_email`, `regsiter_time`) VALUES (?,?)", [email, time]);
        if (subscriber.insertId) {
            return res.status(200).json({ message: "You subscribed successfully." });
        } else {
            return res.status(403).json({ error: "Try after sometime." });
        }
    } catch (err) {
        next(err);
    }
});
router.post("/contact_us", async (req, res, next) => {
    const { email, phoneno, name, description } = req.body;
    if (isEmpty(name)) return res.status(400).json({ error: "Please Provide Nmae" });
    if (isEmpty(email)) return res.status(400).json({ error: "Please Provide email" });
    if (!isEmail(email)) return res.status(400).json({ error: "Please Provide a valid email" });
    if (phoneno.length < 7) return res.status(400).json({ error: "Please Provide a valid mobile number" });
    try {
        let { message } = require("../templates/contact_us");
        await sendMail("User Contact Us", message(name, email, phoneno, description), support_email);

        return res.status(200).json({ message: "Thanks for contact us." });

    } catch (err) {
        next(err);
    }
});

module.exports = router;