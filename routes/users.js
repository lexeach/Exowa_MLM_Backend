const { encryptPassword, decryptPassword, generateStrongPassword } = require("../controllers/passwordAuthenticate");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const sendMail = require("../controllers/sendMail");
const router = require("express").Router();
const { pool } = require("../dbConnection/index");
const verifyToken = require("../middleware/verifyToken");
const { censorEmail } = require('../middleware/string.js');
const { createOtp, createUserId, trx_id } = require('../controllers/createRandomNum.js');
const path = require("path");
const multer = require("multer");
const level_controller = require('../controllers/getLevel_income.js');
const { createdAccount } = require("../controllers/ethereumAccounts.js");
const { isEmpty, isEmail, validatePassword, isValidPhoneNumber, validateEmpty } = require("../middleware/validation.js");
const { verifyPaymentId } = require("../controllers/check_paymentId.js");
const image_path = process.env.image_url;
const support_email = process.env.support_email;
const help_link = process.env.help_link;
const cron = require('node-cron');
// const { trx_id } = require("../../home/thinker/projects/AUTASIS/controllers/createRandomNum.js");
const indiaTime = new Date().toLocaleString("en-GB", { timeZone: "Asia/Kolkata", hour12: false, });
const [datePart, timePart] = indiaTime.split(', ');
const Time = `${datePart.split('/').reverse().join('-')} ${timePart}`;
// const moment = require('moment-timezone');
// const time = Math.floor(Date.now() / 1000);

const storage = multer.diskStorage({
    destination: (req, file, callback) => callback(null, "./public/uploads"),
    filename: (req, file, callback) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e8)}${path.extname(file.originalname)}`;
        callback(null, uniqueName);
    },
});

let upload = multer({
    storage,
    limit: {
        fileSize: 1000000 * 100,
    },
});

const signToken = (userid) => {
    return jwt.sign({
        userid,
        exp: Math.floor(Date.now() / 1000) + parseFloat(process.env.JWT_EXPIRES_IN) * 3600
    }, process.env.JWT_SECRET);
};

///send token in responce of login/registeration----------
const createSendToken = async (user, statusCode, res) => {
    const token = signToken(user.userid);
    user.email = await censorEmail(user.user_email);

    console.log(token, 'token')
    res.status(statusCode).cookie('jwt', token, cookieOptions).json({
        status: 'success',
        token,
        data: {
            user
        }
    });
};

router.post("/register", async (req, res, next) => {
    let { fullname, email, password, referrerID, coreferrerID, country_code, phoneno } = req.body;

    // Get a connection from the pool
    const connection = await pool.getConnection();
    try {
        const time = Math.floor(Date.now() / 1000);
        // Custom validations
        if (isEmpty(email)) return res.status(400).json({ error: "Please Provide email" });
        if (!isEmail(email)) return res.status(400).json({ error: "Please Provide a valid email" });
        if (isEmpty(password)) return res.status(400).json({ error: "Please Provide password" });
        if (!validatePassword(password)) return res.status(400).json({ error: "Password must be at least 8 characters long, contain an uppercase letter, a lowercase letter, a number, and a special symbol." });
        // if (phoneno.length !== 10) return res.status(400).json({ error: "Please Provide a valid mobile number" });
        if (!phoneno || !/^\d{10}$/.test(phoneno)) return res.status(400).json({ error: "Please provide a valid 10-digit mobile number" });
        if (isEmpty(referrerID)) return res.status(400).json({ error: "Referral code is required and cannot be empty." });
        if (isEmpty(coreferrerID)) return res.status(400).json({ error: "Coreferral code is required and cannot be empty." });

        // Database validations
        let [isExists] = await connection.execute("SELECT * FROM `user` WHERE `user_email`=?", [email]);
        if (isExists.length > 0) return res.status(400).json({ error: "User already Exists" });
        let [isPhoneno] = await connection.execute("SELECT * FROM `user` WHERE `mobile_no`=?", [phoneno]);
        if (isPhoneno.length > 0) return res.status(400).json({ error: "Mobile number is already registered" });

        let [checkRefExists] = await connection.execute("SELECT * FROM `user` WHERE userid=?", [referrerID]);
        let [checkCorefExists] = await connection.execute("SELECT * FROM `user` WHERE userid=?", [coreferrerID]);
        if (checkRefExists.length === 0) return res.status(400).json({ error: "Invalid Referral Code" });
        if (checkRefExists[0].status != 1) return res.status(400).json({ error: "Referral user not active" });
        if (checkCorefExists.length === 0) return res.status(400).json({ error: "Invalid Coreferral Code" });
        if (checkCorefExists[0].status != 1) return res.status(400).json({ error: "Co-Referral user not active" });
        if (!checkCorefExists[0].is_partner) return res.status(400).json({ error: 'Coreferrer is not a partner' });

        // Generate user ID, referral code, and other necessary data    
        // const userid = 'AUTASIS' + Math.floor(Math.random() * (999999 - 10 + 1)) + 100;
        const userid = await createUserId();
        const otp = await createOtp();
        const encPass = await encryptPassword(password);
        const trxPass = await generateStrongPassword();
        //const accounts = await createdAccount();
		const accounts="0x...";
        // Start transaction
        await connection.beginTransaction();
        try {
            // Insert user into the database
            await connection.execute(
                "INSERT INTO `user` (`userid`,`user_name`, `user_email`, `user_password`,`payment_password`, `reffereral_code`,`coreferrer_code`,`registration_date`,`mobile_no`, `country_code`, `otp`, `otp_created_at`, `wallet_Address`) VALUES (?,?,?,?,?,?,?,?,?,?,?,NOW(),?)",
                [
                    userid,
                    fullname,
                    email,
                    encPass,
                    trxPass,
                    referrerID,
                    coreferrerID,
                    time,
                    phoneno,
                    country_code,
                    otp,
                    accounts.address
                ]
            );
            // Insert account details
            // await connection.execute("INSERT INTO `accounts` (`userid`, `address`, `privateKey`) VALUES (?,?,?)", [userid, accounts.address, accounts.privateKey]);
            // Update referrer counts and referred_date also check turbo condition
            // if (Number(checkRefExists[0]?.referred_users) + 1 == 3 && Number(checkRefExists[0]?.registration_date) + 2592000 >= time) {
            //     const txId = await trx_id()
            //     console.log(txId, 'get trubo income id--');
            //     await connection.execute('UPDATE user SET referred_users = referred_users + 1, referred_date = ?, is_turbo = TRUE, isWithdraw_beforeTurbo= TRUE, income = income + ?,turbo_income = ?,turbo_active_date = ? WHERE userid = ?', [time, checkRefExists[0].turbo_income, 0, time, referrerID])
            //     await connection.execute(
            //         `INSERT INTO transaction_history 
            //  (userid, transaction_id, transaction_type, amount, old_balance, current_balance, datetime)
            //  VALUES (?, ?, 'get_turbo_income', ?, ?, ?, ?)`,
            //         [referrerID, txId, parseFloat(checkRefExists[0].turbo_income), parseFloat(checkRefExists[0].income), parseFloat(checkRefExists[0].income) + parseFloat(checkRefExists[0].turbo_income), time]
            //     );
            // } else {
            //     await connection.execute('UPDATE user SET referred_users = referred_users + 1,referred_date = ? WHERE userid = ?', [time, referrerID]);
            // }
            // await connection.execute('UPDATE user SET coreferred_users = coreferred_users + 1 WHERE userid = ?', [coreferrerID]);
            // // Update system stats
            // await connection.execute(`UPDATE system_settings SET total_users = total_users + 1`);
            // // Initialize height levels
            // for (let level = 1; level <= 10; level++) {
            //     await connection.execute('INSERT INTO height_levels (userid, pool_level,time) VALUES (?, ?,?)', [userid, level, time]);
            //     await connection.execute('INSERT INTO partner_height_levels (userid, pool_level,time) VALUES (?, ?,?)', [userid, level, time]);
            // }

            // Send registration email
            let { message } = require("../templates/registration");
            await sendMail("Thank you for registering", message(fullname, userid, password, trxPass), email);
            // Insert notification history
            await connection.execute(
                "INSERT INTO `notification_history`(`userid`, `action`, `type`, `status`, `time`) VALUES(?,?,?,?,?)",
                [userid, "Account created successfully", "isaccount", 0, time]
            );

            await connection.commit();
            return res.status(200).json({ success: true, message: "Registered successfully", userid: userid });

        } catch (err) {
            console.error('Error in user registration:', err);
            await connection.rollback();
            return res.status(500).json({ message: "Something went wrong while creating your account, please try again" });
        } finally {
            connection.release();
        }
    } catch (err) {
        console.error('Error in registration route:', err);
        next(err);
    }
});

router.post("/login", async (req, res, next) => {
    const { userid, user_password } = req.body;
    if (isEmpty(userid)) return res.status(400).json({ error: "Please provide user id" });
    if (!user_password) return res.status(400).json({ error: "Please provide your password" });
    try {
        const time = Math.floor(Date.now() / 1000);
        const [exists] = await pool.execute("SELECT * FROM `user` WHERE `userid`=?", [userid]);
        if (exists.length == 0) return res.status(403).json({ error: "User does not exist" });
        if (exists[0].block == 1) return res.status(400).json({ error: "You are blocked please contact the support team" });
        if (exists[0].attempt >= 3) return res.status(400).json({ error: "You are blocked please contact the support team" });
        if (exists[0].block == 2) return res.status(400).json({ error: 'You have deleted your account, if you want to restore your account contact the support team' });

        const isAuthUser = await decryptPassword(user_password, exists[0].user_password);
        if (isAuthUser) {
            //6 digits otp
            const otp = createOtp();
            await pool.execute("UPDATE `user` SET `otp`=?,`attempt`=0, otp_created_at = NOW() WHERE userid=?", [otp, exists[0].userid]);
            let { message } = require("../templates/otp.js");
            await sendMail("One Time Password Verification", message(otp, exists[0].user_name), exists[0].user_email);
            return res.status(200).json({ message: [exists[0].userid, exists[0].user_email] });
        } else {
            let attempts = 1 + exists[0].attempt;
            await pool.execute("UPDATE `user` SET `attempt`=? WHERE userid=?", [attempts, exists[0].userid]);
            if (attempts == 3) {
                await pool.execute("UPDATE `user` SET `block`=1 WHERE userid=?", [exists[0].userid]);
                let { message } = require("../templates/Account_block");
                await sendMail("Account Blocked", message(userid, exists[0].user_email, exists[0].user_name, 'Blocked', 'multiple time wrong password', time), exists[0].user_email);
            }
            return res.status(401).json({ error: "User Id and password is not matched" });
        }
    } catch (err) {
        console.log('error accur in login', err);
        next(err);
    }
});

/* verify login OTP */
router.post("/verify", async (req, res, next) => {
    const { userid, otp } = req.body;
    if (isEmpty(userid)) return res.status(400).json({ error: "Please enter id" });
    if (isEmpty(otp)) return res.status(400).json({ error: "Please enter received otp" });
    let message = validateEmpty(req.body);
    if (message) return res.status(400).json({ error: message });
    try {
        const time = Math.floor(Date.now() / 1000);
        const [exists] = await pool.execute("SELECT `userid`, `user_name` FROM `user` WHERE `userid`=? AND otp=? AND otp_created_at >= NOW() - INTERVAL 10 MINUTE", [userid, otp]);
        if (exists.length == 0) {
            return res.status(403).json({ error: "OTP expired." });
        }
        const [udpatePassword] = await pool.execute("UPDATE `user` SET `lastActive_date`=?, `otp`='' WHERE userid=?", [time, userid]);
        if (udpatePassword.affectedRows > 0) {
            const token = signToken(userid);
            return res.status(200).json({ result: { user: exists[0], token: token } });
        } else {
            return res.status(400).json({ error: "Internel Server Error" });
        }
    } catch (err) {
        next(err);
    }
});

/* RESEND OTP */
router.post("/resend", verifyToken, async (req, res, next) => {
    const { userid } = req.user;
    let message = validateEmpty({ userid });
    if (message) return res.status(400).json({ error: message });
    try {
        const time = Math.floor(Date.now() / 1000);
        const [exists] = await pool.execute("SELECT * FROM `user` WHERE `userid`=?", [userid]);
        if (exists.length == 0) {
            return res.status(403).json({ error: "User Not Found" });
        }
        const otp = createOtp();
        let [resend] = await pool.execute("UPDATE `user` SET `otp`=?, otp_created_at = NOW() WHERE userid=?", [otp, exists[0].userid]);
        let { message } = require("../templates/otp.js");
        await sendMail("One Time Password Verification", message(otp, exists[0].user_name), exists[0].user_email);
        // await sendMessageOtp(exists[0].mobileno, otp);
        if (resend.affectedRows) {
            return res.status(200).json({ message: "OTP send successfully" });
        } else {
            return res.status(400).json({ error: "Internel Server Error" });
        }
    } catch (err) {
        next(err);
    }
});

// --------------- payment password------------------
router.post('/payment_password', verifyToken, async (req, res) => {
    const { pay_password, otp } = req.body;
    const { userid } = req.user;
    if (Object.keys(req.body).length == 0) return res.status(400).json({ error: "Bad request." });
    if (isEmpty(pay_password)) return res.status(400).json({ error: "Enter the payment PIN." });
    if (!validatePassword(pay_password)) return res.status(400).json({ error: "Password must be at least 8 characters long, contain an uppercase letter, a lowercase letter, a number, and a special symbol." });
    try {
        const time = Math.floor(Date.now() / 1000);
        const [exists] = await pool.execute("SELECT * FROM `user` WHERE `userid`=?", [userid]);
        if (exists.length == 0) return res.status(403).json({ error: "User does not exist" });
        const [existss] = await pool.execute("SELECT * FROM `user` WHERE `otp`=? AND otp_created_at >= NOW() - INTERVAL 10 MINUTE", [otp]);
        if (existss.length == 0) {
            return res.status(403).json({ error: "Invalid otp!" });
        }
        // let encPass = await encryptPassword(pay_password);
        const [update] = await pool.execute("UPDATE `user` SET `payment_password`=?, `otp`='0' WHERE `userid`=?", [pay_password, userid]);
        if (update.affectedRows) {
            return res.status(200).json({ message: "Payment password set successfully." });
        } else {
            return res.status(500).json({ error: "Internal server error." })
        }
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
});

//................forget password.....................
router.post("/forgetAppPassword", async (req, res, next) => {
    const { useremail } = req.body;
    let message = validateEmpty(req.body);
    if (message) return res.status(400).json({ error: message });
    try {
        const time = Math.floor(Date.now() / 1000);
        const [exists] = await pool.execute("SELECT * FROM `user` WHERE `user_email`=?", [useremail]);
        if (exists.length == 0) return res.status(403).json({ error: "You are not registered!" });

        if (exists[0].block > 0) return res.status(400).json({ error: "You are blocked please contact the support team" });

        const otp = createOtp();
        //const [existsOtp] = await pool.execute("SELECT * FROM `user` WHERE `otp`=?", [otp]);
        //if (existsOtp.length) return res.status(400).json({ error: "Internal server error,Plase try again!" });
        let [resend] = await pool.execute("UPDATE `user` SET `otp`=? , `attempt`='0', otp_created_at = NOW() WHERE userid=?", [otp, exists[0].userid]);
        let { message } = require("../templates/otp.js");
        const forgotpassword = require("../templates/forgotpassword.js");
        await sendMail("Forget Password", forgotpassword.message(otp), exists[0].user_email);
        if (resend.affectedRows) {
            return res.status(200).json({ message: "Please check your email ", userid: exists[0].userid });
        } else {
            return res.status(400).json({ error: "Internel Server Error" });
        }
    } catch (err) {
        next(err);
    }
});

router.post("/updateForgetPassword", async (req, res, next) => {
    const { password, otp, userid } = req.body;
    if (!otp) return res.status(400).json({ error: "Please enter otp!" });
    if (!password) return res.status(400).json({ error: "Please enter new password" });
    if (!validatePassword(password)) return res.status(400).json({ error: "Password must be at least 8 characters long, contain an uppercase letter, a lowercase letter, a number, and a special symbol." });
    try {
        const [exists] = await pool.execute("SELECT * FROM `user` WHERE `userid`=? AND `otp`=? AND otp_created_at >= NOW() - INTERVAL 10 MINUTE", [userid, otp]);
        if (exists.length == 0) {
            return res.status(403).json({ error: "Invalid otp!" });
        }
        let encPass = await encryptPassword(password);
        const [udpatePassword] = await pool.execute("UPDATE `user` SET `otp`='0',`user_password`=? WHERE otp=? AND `userid`=?", [encPass, otp, userid]);
        if (udpatePassword.affectedRows > 0) {
            return res.status(200).json({ message: "Password reset successfully" });
        } else {
            return res.status(400).json({ error: "Internel Server Error" });
        }
    } catch (err) {
        next(err);
    }
});

// ---------- change internal password ------------//
router.post("/change_password", verifyToken, async (req, res, next) => {
    const { userid } = req.user;
    const { old_password, new_password } = req.body;
    try {
        const [exists] = await pool.execute("SELECT * FROM `user` WHERE `userid`=?", [userid]);
        if (exists.length == 0) {
            return res.status(403).json({ error: "User Not Found" });
        }
        const isAuthUser = await decryptPassword(old_password, exists[0].user_password);
        if (isAuthUser) {
            let encPass = await encryptPassword(new_password);
            const [udpatePassword] = await pool.execute("UPDATE `user` SET `user_password`=? WHERE userid=?", [encPass, userid]);
            if (udpatePassword.affectedRows) {
                return res.status(200).json({ message: "Password update successfully." });
            } else {
                return res.status(400).json({ error: "Internel Server Error" });
            }
        } else {
            return res.status(403).json({ error: "Existing password didn't matched." })
        }
    } catch (err) {
        next(err);
    }
});

//authanticate...............................
router.post("/authanticate", verifyToken, async (req, res, next) => {
    const { userid } = req.user;
    try {
        if (!userid) return res.status(400).json({ error: "Please login first to authenticate" });
        let [exists] = await pool.execute(`SELECT userid, user_email, user_name, user_address,user_state, user_district, user_pincode, wallet_Address, country_code, mobile_no, income, level_income_received, stage_income_received, user_level, registration_date, reffereral_code,coreferrer_code,referred_users,coreferred_users, selfie,partner_income,withdrawable_income,sponser_income,is_partner,partner_id,is_qualified,is_top_approved,is_examPassed,is_turbo,turbo_active_date,isWithdraw_beforeTurbo FROM user WHERE userid = ? AND block = 0 ORDER BY id DESC`, [userid]);
        if (exists.length == 0) return res.status(400).json({ error: "User Not Found" });
        let [user_account] = await pool.execute("SELECT `bank_name`,`bank_add`, `bank_branch`, `ifsc`, `acc_no`, `pan_no`, `status`, `created_at` FROM `bank_kyc` WHERE userid=? order by id desc", [userid]);
        let [deposit_request] = await pool.execute("SELECT * FROM `fiat_payment` WHERE userid=? order by id desc", [userid]);
        let [withdrawal_request] = await pool.execute("SELECT * FROM `withdrawal_request` WHERE userid=? order by id desc", [userid]);
        let [[total_withdrawal]] = await pool.execute(`SELECT COALESCE(SUM(amount), 0) AS total_amount FROM withdrawal_request WHERE userid=? AND status='1'`, [userid]);
        let [[total_deposit]] = await pool.execute(`SELECT COALESCE(SUM(amount), 0) AS total_amount FROM fiat_payment WHERE userid=? AND status='1'`, [userid]);
        const [[{ total_reward }]] = await pool.execute(`SELECT COALESCE(SUM(amount), 0) AS total_reward FROM transaction_history WHERE userid = ? AND transaction_type IN ('referral_bonus', 'coreferral_bonus')`, [userid]);
        let [referral_tree] = await pool.execute("WITH RECURSIVE ReferralTree AS (SELECT u1.userid, u1.user_email, u1.user_name, u1.wallet_Address, u1.country_code, u1.mobile_no, u1.income, u1.level_income_received, u1.stage_income_received, u1.user_level, u1.registration_date, u1.reffereral_code, u1.coreferrer_code, u1.referred_users, u1.coreferred_users, u1.selfie, u1.partner_income, u1.withdrawable_income, u1.sponser_income, u1.is_partner, u1.partner_id, u1.is_qualified, u1.is_top_approved, 1 AS level FROM user u1 WHERE u1.reffereral_code = ? UNION ALL SELECT u2.userid, u2.user_email, u2.user_name, u2.wallet_Address, u2.country_code, u2.mobile_no, u2.income, u2.level_income_received, u2.stage_income_received, u2.user_level, u2.registration_date, u2.reffereral_code, u2.coreferrer_code, u2.referred_users, u2.coreferred_users, u2.selfie, u2.partner_income, u2.withdrawable_income, u2.sponser_income, u2.is_partner, u2.partner_id, u2.is_qualified, u2.is_top_approved, rt.level + 1 FROM user u2 JOIN ReferralTree rt ON u2.reffereral_code = rt.userid WHERE rt.level < 5) SELECT * FROM ReferralTree", [userid]);
        let [transaction_history] = await pool.execute("SELECT * FROM `transaction_history` WHERE userid=? AND  status != 'pending' order by id desc", [userid]);
        let [reffereral_user] = await pool.execute("SELECT userid,user_name,user_email,country_code,mobile_no,income,level_income_received,coreferrer_code,referred_users,coreferred_users,registration_date,selfie,wallet_Address,is_partner,is_qualified,is_top_approved FROM `user` WHERE reffereral_code=? AND status !=? order by id desc", [userid, 0]);
        let [partner_user] = await pool.execute("SELECT userid,user_name,user_email,country_code,mobile_no,income,level_income_received,coreferrer_code,referred_users,coreferred_users,registration_date,selfie,wallet_Address,is_partner,is_qualified,is_top_approved FROM `user` WHERE coreferrer_code=? AND status !=? order by id desc", [userid, 0]);
        let [company_banks] = await pool.execute("SELECT `bank_name`, `ifsc`, `acc_no`,`acc_holder`, `pan_no`, `status` FROM `company_bank` WHERE status=1 order by id desc");
        const [systemMaintenance] = await pool.execute("SELECT * FROM `system_maintenance` WHERE `id`=1");
        const [mergedUserLevels] = await pool.execute(`SELECT l.level, l.amount AS default_amount, IFNULL(uup.amount, 0) AS power_am, IFNULL(ul.is_active, 0) AS is_active, ul.upgrade_time FROM levels l LEFT JOIN user_upgrade_power uup ON l.level = uup.level AND uup.userid = ? LEFT JOIN user_levels ul ON l.level = ul.level AND ul.userid = ? WHERE l.status = 1 ORDER BY l.level ASC`, [userid, userid]);
        const [mergedPartnerLevels] = await pool.execute(`SELECT l.level, l.amount AS default_amount, IFNULL(pup.amount, 0) AS power_am, IFNULL(pl.is_active, 0) AS is_active, pl.upgrade_time FROM levels l LEFT JOIN partner_upgrade_power pup ON l.level = pup.level AND pup.userid = ? LEFT JOIN partner_levels pl ON l.level = pl.level AND pl.userid = ? WHERE l.status = 1 ORDER BY l.level ASC`, [userid, userid]);
        const [userHeightLevels] = await pool.execute(`SELECT pool_level, level_1, level_2, level_3, level_4, level_5, level_6, level_7, level_8, level_9, level_10 FROM height_levels WHERE userid = ?`, [userid]);
        const [partnerHeightLevels] = await pool.execute(`SELECT pool_level, level_1, level_2, level_3, level_4, level_5, level_6, level_7, level_8, level_9, level_10 FROM partner_height_levels WHERE userid = ?`, [userid]);
        const [exam_cleard_user] = await pool.execute(`SELECT userid,user_name,user_email,country_code,mobile_no,coreferrer_code,reffereral_code,selfie FROM user WHERE is_qualified =? AND is_top_approved=? AND coreferrer_code=?`, [0, 1, userid]);
        const [[system_settings]] = await pool.execute(`SELECT passed_perc,partner_referral_required FROM system_settings ORDER BY id DESC LIMIT 1`);
        let [referral_partner_tree] = await pool.execute(`
  WITH RECURSIVE ReferralTree AS (
    SELECT u1.userid, u1.is_partner, u1.is_qualified, 1 AS level
    FROM user u1
    WHERE u1.coreferrer_code = ?
    UNION ALL
    SELECT u2.userid, u2.is_partner, u2.is_qualified, rt.level + 1
    FROM user u2
    JOIN ReferralTree rt ON u2.reffereral_code = rt.userid
    WHERE rt.level < 10
  )
  SELECT 
    level, 
    COUNT(*) AS Total_Partner, 
    SUM(CASE WHEN is_partner = 1 THEN 1 ELSE 0 END) AS Fees_Paid_Partner,
    SUM(CASE WHEN is_qualified = 1 THEN 1 ELSE 0 END) AS Qualified_Partner
  FROM ReferralTree
  GROUP BY level
`, [userid]);

        // Total Partner Qualified partner Fees Paid Partner
        // console.log(userHeightLevels, 'userHeightLevels');  

        const total_team = Number(exists[0].referred_users) + Number(exists[0].coreferred_users)
        const combinedData = {
            ...exists[0],
            user_account,
            total_team,
            deposit_request,
            reffereral_user: reffereral_user,
            partner_user: partner_user,
            withdrawal_request,
            total_withdrawal: total_withdrawal.total_amount,
            total_deposit: total_deposit,
            total_reward: total_reward,
            company_banks,
            transaction_history,
            referral_tree,
            system_maintenance: systemMaintenance[0] || null,
            mergedUserLevels: mergedUserLevels,
            mergedPartnerLevels: mergedPartnerLevels,
            userHeightLevels: userHeightLevels,
            partnerHeightLevels: partnerHeightLevels,
            exam_cleard_user: exam_cleard_user,
            passed_perc: system_settings.passed_perc,
			partner_referral_required: system_settings.partner_referral_required,
            referral_partner_tree: referral_partner_tree,
        };
        return res.status(200).json({ data: combinedData });
    } catch (err) {
        console.log('error accure in authentication', err);
        next(err);
    }
});

// get user notifications..........................
router.get("/getUserNotifitions", verifyToken, async (req, res, next) => {
    const { userid } = req.user;
    try {
        if (!userid) {
            return res.status(400).json({ error: "Please provide user id" });
        }
        const [rows] = await pool.execute("SELECT * FROM `notification_history` WHERE userid=? AND status=? ORDER BY id DESC", [userid, 0]);
        if (rows.length) {
            return res.status(200).json({ data: rows });
        } else {
            return res.status(200).json({ data: "No notification" });
        }
    } catch (err) {
        next(err);
    }
});

// clear user notifications..........................
router.post("/notificationClear", verifyToken, async (req, res, next) => {
    const { userid } = req.user;
    try {
        if (!userid) {
            return res.status(400).json({ error: "Please provide user id" });
        }
        await pool.execute("UPDATE `notification_history` SET `status`=? WHERE userid=?", [1, userid]);
        return res.status(200).json({ message: "notification cleared" });
    } catch (err) {
        next(err);
    }
});

// notification count....................................
router.get("/countNotification", verifyToken, async (req, res, next) => {
    const { userid } = req.user;
    try {
        if (!userid) {
            return res.status(400).json({ error: "Please provide user id" });
        }
        const [row] = await pool.execute("SELECT * FROM `notification_history` WHERE userid=? AND is_seen=? AND status=?", [userid, 0, 0]);
        return res.status(200).json({ data: row.length });
    } catch (err) {
        next(err);
    }
});

// notfication seen update.........................................
router.post("/seenNotification", verifyToken, async (req, res, next) => {
    const { userid } = req.user;
    try {
        if (!userid) return res.status(400).json({ error: "Please provide user id" });
        await pool.execute("UPDATE `notification_history` SET `is_seen`=? WHERE userid=?", [1, userid]);
        return res.status(200).json({ message: "seen status updated" });
    } catch (err) {
        next(err);
    }
});

// ------------------- fetch referral details -----------------
router.post("/fetchreferral", async (req, res, next) => {
    const { referral } = req.body;
    try {
        if (isEmpty(referral)) return res.status(400).json({ error: "Please Provide referral." });
        const [row] = await pool.execute("SELECT `user_name` FROM `user` WHERE userid=? AND block=0", [referral]);
        return res.status(200).json({ data: row[0].user_name });
    } catch (err) {
        next(err);
    }
});
// ------------------- fetch Coreferral details -----------------
router.post("/fetchCoreferral", async (req, res, next) => {
    const { coreferral } = req.body;
    try {
        if (isEmpty(coreferral)) return res.status(400).json({ error: "Please Provide Coreferral." });
        const [row] = await pool.execute("SELECT `user_name` FROM `user` WHERE userid=? AND block=0", [coreferral]);
        return res.status(200).json({ data: row[0].user_name });
    } catch (err) {
        next(err);
    }
});

/* ---------------- user Bank add -----------------*/
router.post("/bank_kyc", verifyToken, async (req, res, next) => {
    const { userid } = req.user;
    const { bank_name, ifsc, acc_no, acc_holder, pan_no, otp, bank_branch, bank_add } = req.body;
    if (!userid) return res.status(400).json({ error: "Please login first to authenticate" });
    if (!bank_name) return res.status(400).json({ error: "Please provide bank name." });
    if (!ifsc) return res.status(400).json({ error: "Please provide bank ifsc code." });
    if (!acc_no) return res.status(400).json({ error: "Please provide bank account no." });
    if (!acc_holder) return res.status(400).json({ error: "Please providde account holder." });
    if (!pan_no) return res.status(400).json({ error: "Please provide pan no." });
    if (!otp) return res.status(400).json({ error: "Please provide otp." });
    try {
        const time = Math.floor(Date.now() / 1000);
        const [block] = await pool.execute("SELECT * FROM `user` WHERE `userid`=?", [userid]);
        if (block.length) {
            if (block[0].block == 1) return res.status(400).json({ error: "You are blocked please contact the support team" });
        }
        const [exists] = await pool.execute("SELECT * FROM `user` WHERE `userid`=?", [userid]);
        if (exists.length == 0) {
            return res.status(403).json({ error: "User does not exist" });
        }
        const [existsbank] = await pool.execute("SELECT * FROM `bank_kyc` WHERE `userid`=? AND acc_no=?", [userid, acc_no]);
        if (existsbank.length > 0) {
            return res.status(403).json({ error: "Account already exist" });
        }
        // CHECK ATTEMPTS
        if (exists[0].attempt > 2) {
            return res.status(400).json({ error: "You are blocked please contact the support team" });
        }
        const [isblock] = await pool.execute("SELECT * FROM `user` WHERE `userid`=? AND block=1", [userid]);
        if (isblock.length > 0) {
            return res.status(400).json({ error: "You are blocked please contact the support team" });
        }
        const [isotp] = await pool.execute("SELECT * FROM `user` WHERE `userid`=? AND otp=?", [userid, otp]);
        if (isotp.length > 0) {
            // if (isAuthUser) {
            const [addbank] = await pool.execute("INSERT INTO `bank_kyc`(`userid`, `bank_name`,`bank_add`, `bank_branch`, `ifsc`, `acc_no`, `acc_holder`, `pan_no`, `created_at`) VALUES (?,?,?,?,?,?,?,?,?)", [userid, bank_name, bank_add, bank_branch, ifsc, acc_no, acc_holder, pan_no, time]);
            if (addbank.insertId) {
                await pool.execute("UPDATE `user` SET `otp`='' WHERE userid=?", [userid]);
                // Insert notification history
                await pool.execute("INSERT INTO `notification_history`(`userid`, `action`, `type`, `status`, `time`) VALUES(?,?,?,?,?)", [userid, "Bank Added successfully", "isaccount", 0, time]);
                return res.status(200).json({ message: "Bank Added Successfully." });
            } else {
                return res.status(400).json({ error: "Something went wrong!" });
            }
        } else {
            return res.status(401).json({ error: "OTP is not matched." });
        }
    } catch (err) {
        next(err);
    }
});

/*---------------- Deposit Request -----------------*/
router.post("/deposit_request", [verifyToken, upload.fields([{ name: "photo", maxCount: 1 }])], async (req, res, next) => {
    const { userid } = req.user;
    let { acc_holder, amountindollar, amountinrupees, transaction_reference, payment_mode, payment_date } = req.body;
    amountinrupees = parseFloat(amountinrupees).toFixed(2);

    // Input validation
    if (!userid) return res.status(400).json({ error: "Please login first to authenticate" });
    if (amountinrupees <= 0) return res.status(400).json({ error: "Please provide correct amount." });
    if (!amountinrupees) return res.status(400).json({ error: "Please provide amount in rupees." });
    if (!amountindollar) return res.status(400).json({ error: "Please provide amount in dollar." });
    if (!transaction_reference) return res.status(400).json({ error: "Please provide transaction reference no." });
    if (!acc_holder) return res.status(400).json({ error: "Please provide account holder." });
    if (!payment_mode) return res.status(400).json({ error: "Please provide payment mode." });
    if (!payment_date) return res.status(400).json({ error: "Please provide payment date." });
    if (!req.files?.photo) return res.status(400).json({ error: "Please provide slip image." });

    let connection;
    try {
        const time = Math.floor(Date.now() / 1000);
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Generate transaction ID
        let transaction_id = await trx_id();
        let transacation_slip = "";
        // Check user status
        const [user] = await connection.execute("SELECT * FROM `user` WHERE `userid`=?", [userid]);
        if (user.length === 0) {
            await connection.rollback();
            return res.status(403).json({ error: "User does not exist" });
        }

        if (user[0].block === 1) {
            await connection.rollback();
            return res.status(400).json({ error: "You are blocked please contact the support team" });
        }

        if (user[0].attempt > 2) {
            await connection.rollback();
            return res.status(400).json({ error: "You are blocked please contact the support team" });
        }

        // Process file upload
        if (req.files?.photo?.length > 0) {
            transacation_slip = `/uploads/${req.files.photo[0].filename}`;
        }

        // Insert payment record
        const [addbank] = await connection.execute(
            `INSERT INTO fiat_payment 
            (userid, transaction_reference, depositor_name, transaction_id, amount, slip_image, date_time, amount_dollar, transaction_mode) 
            VALUES (?,?,?,?,?,?,?,?,?)`,
            [userid, transaction_reference, acc_holder, transaction_id, amountinrupees, transacation_slip, payment_date, amountindollar, payment_mode]
        );

        if (!addbank.insertId) {
            await connection.rollback();
            return res.status(400).json({ error: "Failed to create deposit request" });
        }

        // Send email notification
        let { message } = require("../templates/depsoit_request");
        await sendMail("Deposit Invoice Generated", message(transaction_id, user[0].user_name, time, amountinrupees, amountindollar, payment_mode, transaction_reference, support_email, 'Pending'), user[0].user_email);

        // Add notification history
        await connection.execute(`INSERT INTO notification_history (userid, action, type, status, time) VALUES(?,?,?,?,?)`, [userid, "Deposit Request Generated", "istransaction", 0, time]);

        await connection.commit();
        return res.status(200).json({ message: "Deposit Request Generated Successfully." });

    } catch (err) {
        console.error("Deposit request error:", err);
        if (connection) await connection.rollback();
        return res.status(500).json({ error: "Internal server error" });
    } finally {
        if (connection) connection.release();
    }
});

/*---------------- Withdrawal Request -----------------*/
router.post("/withdrawal_request", verifyToken, async (req, res, next) => {
    const { userid } = req.user;
    let { amount, amount_dollar, accountno, pancard } = req.body;

    // Input validation
    if (!userid) return res.status(400).json({ error: "Please login first to authenticate" });
    if (!amount) return res.status(400).json({ error: "Please provide amount in rupees." });
    if (amount <= 0) return res.status(400).json({ error: "Please provide correct amount." });
    if (!amount_dollar) return res.status(400).json({ error: "Please provide amount in dollar." });
    if (!accountno) return res.status(400).json({ error: "Please provide bank account." });

    amount = parseFloat(amount).toFixed(2);
    let connection;
    const time = Math.floor(Date.now() / 1000);
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Generate transaction ID
        let transaction_id = await trx_id();
		// check kyc
		const [kyc] = await connection.execute("SELECT * FROM `bank_kyc` WHERE `userid`=?", [userid]);
		if (kyc.length === 0) {
            await connection.rollback();
            return res.status(403).json({ error: "KYC does not exist" });
        }
		if (kyc[0].status ===0) {
            await connection.rollback();
            return res.status(400).json({ error: "Kyc is still pending" });
        }
        // Check user status
        const [user] = await connection.execute("SELECT * FROM `user` WHERE `userid`=?", [userid]);
        if (user.length === 0) {
            await connection.rollback();
            return res.status(403).json({ error: "User does not exist" });
        }
        if (user[0].attempt > 2 || user[0].block === 1) {
            await connection.rollback();
            return res.status(400).json({ error: "You are blocked please contact the support team" });
        }
        // Check balance
        let remaining_balance = (parseFloat(user[0].income) - parseFloat(amount));
        if (remaining_balance < 0) {
            await connection.rollback();
            return res.status(400).json({ error: "Insufficient funds for withdrawal" });
        }
        const [[system_settings]] = await connection.execute(`SELECT min_withdrawal FROM system_settings ORDER BY id DESC LIMIT 1`);
        const min_withdrawal = system_settings.min_withdrawal;
        if (min_withdrawal > amount) {
            await connection.rollback();
            return res.status(400).json({ error: `Minimum withdrawal is ${min_withdrawal} ` });
        }

        // Create withdrawal request
        const [withdrawal] = await connection.execute(`
            INSERT INTO withdrawal_request 
            (userid, bank_account, pancard, transaction_id, amount, amount_dollar, date_time)
             VALUES (?,?,?,?,?,?,?)`,
            [userid, accountno, pancard, transaction_id, amount, amount_dollar, Time]
        );
        if (!withdrawal.insertId) {
            await connection.rollback();
            return res.status(400).json({ error: "Failed to create withdrawal request" });
        }

        // Record transaction history
        await connection.execute(
            `INSERT INTO transaction_history 
            (userid, transaction_id, transaction_type, old_balance, amount, current_balance, datetime,status)
            VALUES (?,?,?,?,?,?,?,'pending')`,
            [userid, transaction_id, 'withdrawal', user[0].income, amount, remaining_balance, time]
        );
        // Update user balance
        await connection.execute("UPDATE `user` SET `income`=? WHERE `userid`=?", [remaining_balance, userid]);
        // Add notification
        await connection.execute(
            `INSERT INTO notification_history 
            (userid, action, type, status, time) 
            VALUES(?,?,?,?,?)`,
            [userid, "Withdrawal Request Generated", "istransaction", 0, time]
        );

        await connection.commit();
        return res.status(200).json({
            message: "Withdrawal Request Generated Successfully.",
            data: {
                transaction_id,
                new_balance: remaining_balance
            }
        });

    } catch (err) {
        console.error("Withdrawal request error:", err);
        if (connection) await connection.rollback();
        return res.status(500).json({
            error: "Internal server error",
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    } finally {
        if (connection) connection.release();
    }
});

/* Profile update................................................................................*/
router.post("/profile_update", [verifyToken, upload.fields([{ name: "photo", maxCount: 1 }])], async (req, res, next) => {
    let message = validateEmpty(req.body);
    const { userid } = req.user;
    if (message) return res.status(400).json({ error: message });
    if (!req.body.name) return res.status(400).json({ error: "Please provide name" });
    if (!req.body.email) return res.status(400).json({ error: "Please provide email id" });
    if (!req.body.country_code) return res.status(400).json({ error: "Please provide country" });
    if (!req.body.phoneno) return res.status(400).json({ error: "Please provide phone number" }); 
	if (!req.body.address) return res.status(400).json({ error: "Please provide address" });
    if (!req.body.phoneno || !/^\d{10}$/.test(req.body.phoneno)) return res.status(400).json({ error: "Please provide a valid 10-digit mobile number" });

    let connection;
    try {
        const time = Math.floor(Date.now() / 1000);
        connection = await pool.getConnection();
        await connection.beginTransaction();
        // Check if the phone number is already associated with another user
        const [existingUser] = await connection.execute("SELECT * FROM `user` WHERE `mobile_no`=? AND userid!=?", [req.body.phoneno, userid]);
        if (existingUser.length > 0) {
            await connection.rollback();
            return res.status(400).json({ message: "This phone number is already associated with another user" });
        }

        // Check if email is already associated with another user
        const [existingEmail] = await connection.execute("SELECT * FROM `user` WHERE `user_email`=? AND userid!=?", [req.body.email, userid]);
        if (existingEmail.length > 0) {
            await connection.rollback();
            return res.status(400).json({ message: "This email is already associated with another user" });
        }

        let selfie = "";
        if (req.files?.photo?.length > 0) selfie = `/uploads/${req.files.photo[0].filename}`;

        // Update user profile
        const [UPDATE] = await connection.execute(
            selfie
                ? "UPDATE user SET user_name=?, user_email=?, country_code=?, mobile_no=?, selfie=?, user_address=?, user_state=?, user_district=?, user_pincode=? WHERE userid=?"
                : "UPDATE user SET user_name=?, user_email=?, country_code=?, mobile_no=?, user_address=? , user_state=?, user_district=?, user_pincode=? WHERE userid=?",
            selfie
                ? [req.body.name, req.body.email, req.body.country_code, req.body.phoneno, selfie, req.body.address, req.body.state, req.body.district, req.body.pincode, userid]
                : [req.body.name, req.body.email, req.body.country_code, req.body.phoneno, req.body.address, req.body.state, req.body.district, req.body.pincode, userid]
        );

        if (UPDATE.affectedRows === 0) {
            await connection.rollback();
            return res.status(400).json({ message: "No changes were made to the profile" });
        }

        // Add notification
        await connection.execute(
            "INSERT INTO `notification_history`(`userid`, `action`, `type`, `status`, `time`) VALUES(?,?,?,?,?)",
            [userid, "Profile update successfully", "isaccount", 0, time]
        );
        // Get updated user data
        const [updatedData] = await connection.execute("SELECT `user_name`,`user_email`,`mobile_no`,`selfie` FROM `user` WHERE userid=?", [userid]);
        await connection.commit();
        return res.status(200).json({ message: "Profile updated successfully", result: updatedData[0] });
    } catch (err) {
        console.error('Error in profile update:', err);
        if (connection) await connection.rollback();
        return res.status(500).json({
            error: "An error occurred while updating the profile",
            details: err.message
        });
    } finally {
        if (connection) connection.release();
    }
});

//activate User Level-------------------------------
router.post('/activate-level', verifyToken, async (req, res) => {
    const { userid } = req.user;
    const { paymentId, short_URL } = req.body
    if (isEmpty(paymentId)) return res.status(400).json({ status: false, message: "Payment ID is required." });
    if (isEmpty(short_URL)) return res.status(400).json({ status: false, message: "Short URL is required." });

    const conn = await pool.getConnection();
    try {
        const time = Math.floor(Date.now() / 1000);
        await conn.beginTransaction();
        // Get user data with FOR UPDATE lock (corrected clause order)
        const [[user]] = await conn.execute(`SELECT * FROM user WHERE userid = ? LIMIT 1`, [userid]);
        if (!user) {
            await conn.rollback();
            return res.status(400).json({ status: false, message: "User not found" });
        }
        if (user.block !== 0) {
            await conn.rollback();
            return res.status(400).json({ status: false, message: "Your account is blocked." });
        }
        const verify = await verifyPaymentId(paymentId);
        if (!verify) return res.status(400).json({ status: false, message: "Your transaction faild." });
        // Check level activation status (optimized with EXISTS)
        const [[levelCheck]] = await conn.execute(
            `SELECT EXISTS(
                SELECT 1 FROM user_levels 
                WHERE userid = ? AND level = 1 AND is_active = TRUE
            ) AS level_exists`,
            [userid]
        );
        if (levelCheck.level_exists) {
            await conn.rollback();
            return res.status(400).json({ status: false, message: 'Level already activated' });
        }

        const [checkRefExists] = await conn.execute(`SELECT * FROM user WHERE userid = ? LIMIT 1`, [user.reffereral_code]);
        const [corefferal_user] = await conn.execute(`SELECT * FROM user WHERE userid = ? LIMIT 1`, [user.coreferrer_code]);
        // Process bonuses and update balance
        const [[level_amount]] = await conn.execute('SELECT amount FROM levels WHERE level=?', [1]);
        const upgradeAmount = parseFloat(level_amount.amount);
        // Update system stats
        await conn.execute(
            `UPDATE system_settings 
             SET 
                company_revenue = company_revenue + ?,
                system_reserve = system_reserve + ?
             ORDER BY id DESC LIMIT 1`,
            [upgradeAmount, upgradeAmount]
        );
        // Activate levels
        await conn.execute(`INSERT INTO user_levels (userid, level, is_active, upgrade_time) VALUES (?, 1, TRUE, ?)`, [userid, time]);
        await conn.execute(`INSERT INTO partner_levels (userid, level, is_active, upgrade_time) VALUES (?, 1, TRUE, ?)`, [userid, time]);

        // update Record transaction
        await conn.execute(`UPDATE transaction_history SET payment_id=?,transaction_id=?, status='completed' WHERE 
            transaction_id=? AND userid=?`, [paymentId, paymentId, short_URL, userid]);

        await conn.execute(`UPDATE user SET status=? WHERE userid=?`, [1, userid]);

        // Update corefferal
        // if (Number(checkRefExists[0]?.referred_users) + 1 == 3 && Number(checkRefExists[0]?.registration_date) + 2592000 >= time) {
        if (Number(checkRefExists[0]?.referred_users) + 1 == 3 && Number(checkRefExists[0]?.registration_date) + 3600 >= time) {
            const txId = await trx_id();
            const turbo_income = parseFloat(checkRefExists[0].turbo_income);

            await conn.execute('UPDATE user SET referred_users = referred_users + 1, referred_date = ?, is_turbo = TRUE, isWithdraw_beforeTurbo= TRUE, income = income + ?,turbo_income = ?,turbo_active_date = ?,sponser_income=sponser_income+? WHERE userid = ?', [time, turbo_income, 0, time, turbo_income, checkRefExists[0].userid,]);
            await conn.execute(`UPDATE system_settings SET total_distributed = total_distributed + ?,system_reserve =system_reserve-?`,
                [turbo_income, turbo_income]);

            await conn.execute(
                `INSERT INTO transaction_history 
             (userid, transaction_id, transaction_type, amount, old_balance, current_balance, datetime)
             VALUES (?, ?, 'get_turbo_income', ?, ?, ?, ?)`,
                [checkRefExists[0].userid, txId, turbo_income, parseFloat(checkRefExists[0].income), parseFloat(checkRefExists[0].income) + turbo_income, time]
            );

        } else {
            await conn.execute('UPDATE user SET referred_users = referred_users + 1,referred_date = ? WHERE userid = ?', [time, checkRefExists[0].userid]);
        }
        // Update corefferal
        await conn.execute('UPDATE user SET coreferred_users = coreferred_users + 1 WHERE userid = ?', [corefferal_user[0].userid]);
        // Update system stats
        await conn.execute(`UPDATE system_settings SET total_users = total_users + 1`);

        // Initialize height levels
        for (let level = 1; level <= 10; level++) {
            await conn.execute('INSERT INTO height_levels (userid, pool_level,time) VALUES (?, ?,?)', [userid, level, time]);
            await conn.execute('INSERT INTO partner_height_levels (userid, pool_level,time) VALUES (?, ?,?)', [userid, level, time]);
        }

        // Add notification history
        await conn.execute(
            `INSERT INTO notification_history 
             (userid, action, type, status, time) 
             VALUES (?, ?, ?, ?, ?)`,
            [userid, "Congrats! You have activated your Level 1.", "activation_level", 0, time]
        );
        await level_controller.processReferralBonuses(conn, userid, userid, 1, upgradeAmount, 1, time, paymentId, true);
        await level_controller.processCoreferralBonuses(conn, userid, userid, 1, upgradeAmount, 1, time, paymentId, true);
        await conn.commit();
        return res.json({ success: true, level: 1, message: `Level 1 activated successfully` });
    } catch (error) {
        await conn.rollback();
        console.error('Activate level error:', error);
        res.status(500).json({ status: false, message: "Something went wrong. Please try again." });
    } finally {
        conn.release();
    }
});

//Upgrade User Level------------------------------
router.post('/upgrade-level', verifyToken, async (req, res) => {
    const { level } = req.body;
    const { userid } = req.user;
    // Validate level
    if (!level || level < 2 || level > 10) return res.status(400).json({ error: 'Invalid level' });
    const time = Math.floor(Date.now() / 1000);
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        // 1. Check user exists and is not blocked (with FOR UPDATE lock)
        const [[user]] = await conn.execute(`SELECT income, block FROM user WHERE userid = ? LIMIT 1`, [userid]);
        if (!user) {
            await conn.rollback();
            return res.status(400).json({ status: false, message: "User not found" });
        }
        if (user.block !== 0) {
            await conn.rollback();
            return res.status(400).json({ status: false, message: "Your account is blocked." });
        }
        const [hasPrevLevel] = await conn.execute(`SELECT level FROM user_levels WHERE userid = ? AND level = ?
             AND is_active = TRUE`, [userid, level - 1]
        );
        if (hasPrevLevel.length == 0) {
            await conn.rollback();
            return res.status(400).json({ error: 'Upgrade lower level first' });
        }
        console.log(userid, level, 'userid,level');
        // 3. Check if already upgraded
        const [hasCurrentLevel] = await conn.execute(`SELECT * FROM user_levels WHERE userid = ? AND level = ?
             AND is_active = TRUE`, [userid, level]
        );
        if (hasCurrentLevel.length > 0) {
            await conn.rollback();
            return res.status(400).json({ error: 'Already upgraded' });
        }
        // 4. Check upgrade power
        const [[level_amount]] = await conn.execute('SELECT amount FROM levels WHERE level=?', [Number(level)]);
        const upgradeAmount = parseFloat(level_amount.amount);
        const [[upgradePower]] = await conn.execute(
            `SELECT amount FROM user_upgrade_power WHERE userid = ? AND level = ? LIMIT 1`,
            [userid, level - 1]
        );
        // 5. Calculate remaining balance after upgrade
        const remainingBalance = parseFloat(upgradePower?.amount) - parseFloat(upgradeAmount);
        if (!upgradePower || upgradePower?.amount < upgradeAmount) {
            await conn.rollback();
            return res.status(400).json({ error: 'Insufficient upgrade power' });
        }
        // 5. Upgrade level
        await conn.execute(`INSERT INTO user_levels (userid, level, is_active, upgrade_time) VALUES (?, ?, TRUE, ?)`, [userid, level, time]);
        // 6. Clear upgrade power
        // await conn.execute(`UPDATE user_upgrade_power SET amount = 0 WHERE userid = ? AND level = ?`, [userid, level - 1]);
        // 7. Update upgrade power (deduct only the required amount)
        await conn.execute(`UPDATE user_upgrade_power SET amount = ? WHERE userid = ? AND level = ?`,
            [remainingBalance, userid, level - 1]
        );
        // await conn.execute(`INSERT INTO user_upgrade_power (userid, level, amount, time) VALUES (?, ?, ?, ?)`, [userid, level, 0, time]);
        await conn.execute(
            `INSERT INTO user_upgrade_power (userid, level, amount, time) 
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE 
                    amount = amount + VALUES(amount),
                    time = GREATEST(time, VALUES(time))`,
            [userid, level, 0, time]
        );

        // Update system stats
        await conn.execute(
            `UPDATE system_settings 
             SET 
                company_revenue = company_revenue + ?,
                system_reserve = system_reserve + ?
             ORDER BY id DESC LIMIT 1`,
            [upgradeAmount, upgradeAmount]
        );
        // 7. Record transaction
        const txId = await trx_id();
        const paymentId = await trx_id();
        await conn.execute(
            `INSERT INTO transaction_history 
             (userid, transaction_id, transaction_type, power, old_power, current_power, datetime,upgrade_level)
             VALUES (?, ?, 'upgrade', ?, ?, ?, ?,?)`,
            [userid, txId, upgradeAmount, upgradePower.amount, remainingBalance, time, level]
        );
        // Add notification history
        await conn.execute(
            `INSERT INTO notification_history 
             (userid, action, type, status, time) 
             VALUES (?, ?, ?, ?, ?)`,
            [userid, `Congrats! You have upgraded your Level ${level}.`, "upgrade_level", 0, time]
        );
        // 8. Process referral bonuses and update balance
        await Promise.all([
            level_controller.processReferralBonuses(conn, userid, userid, 1, upgradeAmount, level, time, paymentId),
        ]);
        await conn.commit();
        return res.status(200).json({ status: true, level, message: `Level ${level} upgraded successfully` });
    } catch (error) {
        await conn.rollback();
        console.error('Upgrade error:', error);
        res.status(500).json({ error: 'Upgrade failed' });
    } finally {
        conn.release();
    }
});

// Partner Level Upgrade-----------------------
router.post('/upgrade-partner-level', verifyToken, async (req, res) => {
    const { level } = req.body;
    const { userid } = req.user;
    // Validate input
    if (!level || isNaN(level)) {
        return res.status(400).json({ status: false, message: 'Level is required and must be a number' });
    }
    const numericLevel = Number(level);
    if (numericLevel < 2 || numericLevel > 10) {
        return res.status(400).json({ status: false, message: 'Level must be between 2 and 10' });
    }
    const time = Math.floor(Date.now() / 1000);
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        // 1. Validate user is an active partner with FOR UPDATE lock
        const [[user]] = await conn.execute(
            `SELECT is_partner, income, block FROM user 
             WHERE userid = ? LIMIT 1 FOR UPDATE`,
            [userid]
        );
        if (!user) {
            await conn.rollback();
            return res.status(404).json({ status: false, message: 'User not found' });
        }
        if (user.block !== 0) {
            await conn.rollback();
            return res.status(403).json({ status: false, message: 'Your account is blocked' });
        }
        if (!user.is_partner) {
            await conn.rollback();
            return res.status(403).json({ status: false, message: 'Only partners can upgrade levels' });
        }
        // 2. Check previous level is active
        const [prevLevel] = await conn.execute(
            `SELECT 1 FROM partner_levels 
             WHERE userid = ? AND level = ? AND is_active = TRUE`,
            [userid, numericLevel - 1]
        );
        if (!prevLevel.length) {
            await conn.rollback();
            return res.status(400).json({ status: false, message: `Please complete level ${numericLevel - 1} first` });
        }
        // 3. Check if already upgraded to this level
        const [currentLevel] = await conn.execute(
            `SELECT 1 FROM partner_levels 
             WHERE userid = ? AND level = ? AND is_active = TRUE`,
            [userid, numericLevel]
        );
        if (currentLevel.length) {
            await conn.rollback();
            return res.status(400).json({ status: false, message: `Level ${numericLevel} already upgraded` });
        }
        // 4. Get level upgrade cost
        const [[levelData]] = await conn.execute(`SELECT amount FROM levels WHERE level = ?`, [numericLevel]);
        if (!levelData) {
            await conn.rollback();
            return res.status(500).json({ status: false, message: 'Level configuration not found' });
        }
        const upgradeAmount = parseFloat(levelData.amount);
        // 5. Check upgrade power from previous level
        const [[upgradePower]] = await conn.execute(
            `SELECT amount FROM partner_upgrade_power 
             WHERE userid = ? AND level = ? LIMIT 1 FOR UPDATE`,
            [userid, numericLevel - 1]
        );
        if (!upgradePower) {
            await conn.rollback();
            return res.status(400).json({ status: false, message: `No upgrade power found for level ${numericLevel - 1}` });
        }
        const currentPower = parseFloat(upgradePower.amount);
        if (currentPower < upgradeAmount) {
            await conn.rollback();
            return res.status(400).json({ status: false, message: `Insufficient upgrade power (Needed: ${upgradeAmount}, Available: ${currentPower})` });
        }
        // 6. Calculate remaining balance
        const remainingBalance = currentPower - upgradeAmount;
        // 7. Upgrade partner level
        await conn.execute(
            `INSERT INTO partner_levels 
             (userid, level, is_active, upgrade_time) 
             VALUES (?, ?, TRUE, ?)`,
            [userid, numericLevel, time]
        );
        // 8. Update upgrade power (deduct the upgrade amount)
        await conn.execute(
            `UPDATE partner_upgrade_power 
             SET amount = ? 
             WHERE userid = ? AND level = ?`,
            [remainingBalance, userid, numericLevel - 1]
        );
        //Update system stats
        await conn.execute(
            `UPDATE system_settings 
             SET 
                company_revenue = company_revenue + ?,
                system_reserve = system_reserve + ?
             ORDER BY id DESC LIMIT 1`,
            [upgradeAmount, upgradeAmount]
        );

        // 10. Record transaction
        const txId = await trx_id();
        const paymentId = await trx_id();
        await conn.execute(
            `INSERT INTO transaction_history 
             (userid, transaction_id, transaction_type, power,
              old_power, current_power, datetime,upgrade_level)
             VALUES (?, ?, 'partner_upgrade', ?, ?, ?, ?,?)`,
            [userid, txId, upgradeAmount, currentPower, remainingBalance, time, numericLevel]);

        // 11. Add notification
        await conn.execute(
            `INSERT INTO notification_history 
             (userid, action, type, status, time) 
             VALUES (?, ?, ?, ?, ?)`,
            [userid, `Congratulations! You've upgraded to partner level ${numericLevel}.`,
                "partner_level_upgrade", 0, time]
        );
        // 12. Process co-referral bonuses if needed
        try {
            await level_controller.processCoreferralBonuses(conn, userid, userid, 1, upgradeAmount, numericLevel, time, paymentId);
        } catch (bonusError) {
            console.error('Coreferral bonus processing failed:', bonusError);
            // Continue even if bonus processing fails
        }
        await conn.commit();
        return res.status(200).json({
            status: true,
            level: numericLevel,
            amountUsed: upgradeAmount,
            remainingPower: remainingBalance,
            message: `Successfully upgraded to partner level ${numericLevel}`
        });
    } catch (error) {
        await conn.rollback();
        console.error('Partner upgrade error:', error);

        if (error.code === 'ER_LOCK_WAIT_TIMEOUT') { return res.status(503).json({ status: false, message: 'System busy. Please try again later.' }); }
        return res.status(500).json({ status: false, message: 'Something went wrong. Please try again.' });
    } finally {
        conn.release();
    }
});

// Pay Partner Fee ----------------------------------
router.post('/become-partner', verifyToken, async (req, res) => {
    const { userid } = req.user;
    const time = Math.floor(Date.now() / 1000);
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        // 1. Check user exists and get qualification status (with FOR UPDATE lock)
        const [[user]] = await conn.execute(`SELECT income, block, is_qualified, is_partner, is_top_approved FROM user WHERE userid = ? LIMIT 1`, [userid]);
        if (!user) {
            await conn.rollback();
            return res.status(400).json({ status: false, message: "User not found" });
        }
        if (user.block !== 0) {
            await conn.rollback();
            return res.status(400).json({ status: false, message: "Your account is blocked." });
        }
        // 2. Check if already partner
        if (user.is_partner == 1) {
            await conn.rollback();
            return res.status(400).json({ status: false, message: 'Already a partner' });
        }
        // 3. Check qualification
        if (user.is_qualified == 0) {
            await conn.rollback();
            return res.status(400).json({ status: false, message: 'Not qualified to be partner' });
        }
        if (user.is_qualified === 2) {
            await conn.rollback();
            return res.status(400).json({ status: false, message: 'Rejected by upper level' });
        }
        if (user.is_top_approved == 0) {
            await conn.rollback();
            return res.status(400).json({ status: false, message: 'TOP approval required' });
        }

        const [[settings]] = await conn.execute(`SELECT partner_fee, total_qualified_users FROM system_settings ORDER BY id DESC LIMIT 1`,);
        // 5. Get partner fee amount
        const partnerFee = parseFloat(settings.partner_fee);
        if (parseFloat(user.income) < partnerFee) {
            await conn.rollback();
            return res.status(400).json({ status: false, message: 'Insufficient balance for partener fees.' });
        }
        // 6. Assign partner ID and update user as partner
        const partnerId = settings.total_qualified_users + 1;

        // 7. Update system stats
        await conn.execute(
            `UPDATE system_settings SET 
                company_revenue = company_revenue + ?,
				total_distributed=total_distributed-?,
                system_reserve = system_reserve + ?,
				
                total_qualified_users = total_qualified_users + 1`,
            [partnerFee, partnerFee, partnerFee]
        );
        // 8. Record transaction
        const txId = await trx_id();
        await conn.execute(
            `INSERT INTO transaction_history 
             (userid, transaction_id, transaction_type, amount, old_balance, current_balance, datetime)
             VALUES (?, ?, 'partner_fee', ?, ?, ?, ?)`,
            [userid, txId, partnerFee, user.income, Number(user.income) - partnerFee, time]
        );
        // 9. Update user income (reflect the upgrade in their balance)
        await conn.execute(`UPDATE user SET income = income - ?,partner_id=?,is_partner=? WHERE userid = ?`, [partnerFee, partnerId, 1, userid]);

        // Add notification history
        await conn.execute(
            `INSERT INTO notification_history 
             (userid, action, type, status, time) 
             VALUES (?, ?, ?, ?, ?)`,
            [userid, `Congrats! You have become a partner now.`, "become_partner", 0, time]
        );
        // 10. Add partner count to upline (coreferral chain)
        await level_controller.addPartnerCount(conn, 1, userid);

        await conn.commit();
        res.json({ status: true, partnerId, message: 'Partner fee paid successfully' });
    } catch (error) {
        await conn.rollback();
        console.error('become-partner error:', error);
        return res.status(500).json({ status: false, message: 'Something went wrong. Please try again' });
    } finally {
        conn.release();
    }
});

//Transfer Partnership---------------------------- 
router.post('/transfer-partnership', verifyToken, async (req, res) => {
    const { newPartnerId } = req.body;
    const { userid } = req.user;
    const time = Math.floor(Date.now() / 1000);
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Validate current user is partner (with FOR UPDATE lock)
        const [[currentUser]] = await conn.execute(`SELECT income, block, is_partner,is_top_approved FROM user WHERE userid = ? LIMIT 1`, [userid]);
        if (!currentUser) {
            await conn.rollback();
            return res.status(400).json({ status: false, message: "User not found" });
        }
        if (currentUser.block !== 0) {
            await conn.rollback();
            return res.status(400).json({ status: false, message: "Your account is blocked." });
        }
        if (!currentUser.is_partner) {
            await conn.rollback();
            return res.status(400).json({ status: false, message: "Not a partner" });
        }
        // 2. Validate new partner is a coreferral (your direct referral)
        const [[newPartner]] = await conn.execute(`SELECT coreferrer_code,is_qualified,is_partner FROM user WHERE userid = ? LIMIT 1`, [newPartnerId]);

        if (!newPartner || newPartner.coreferrer_code !== userid) {
            await conn.rollback();
            return res.status(400).json({ status: false, message: "Not your coreferral" });
        }
        if (newPartner.is_partner) {
            await conn.rollback();
            return res.status(400).json({ status: false, message: "User already a partener." });
        }
        if (newPartner.is_qualified == 1) {
            await conn.rollback();
            return res.status(400).json({ status: false, message: "User already a Qualified." });
        }

        //Update TOP status
        await conn.execute(`UPDATE user SET is_qualified = ?,is_top_approved=?  WHERE userid = ?`, [1, 1, newPartnerId]);
        // Add notification history
        await conn.execute(
            `INSERT INTO notification_history 
             (userid, action, type, status, time) 
             VALUES (?, ?, ?, ?, ?)`,
            [userid, `Congrats! You have transferred partnership to ${newPartnerId}.`, "activation_level", 0, time]
        );
        await conn.execute(
            `INSERT INTO notification_history 
                (userid, action, type, status, time) 
                VALUES (?, ?, ?, ?, ?)`,
            [newPartnerId, `Congratulations! You have been promoted to a Partner.`, "activation_partner", 0, time]
        );
        await conn.commit();
        return res.status(200).json({ status: true, message: 'Partnership transferred successfully' });
    } catch (error) {
        await conn.rollback();
        console.error('Transfer partnership error:', error);
        res.status(500).json({ status: false, message: 'Transfer partnership failed' });
    } finally {
        conn.release();
    }
});

// Shift Power (User)------------------------------
router.post('/shift-power', verifyToken, async (req, res) => {
    const { fromLevel, toLevel, amount } = req.body;
    const { userid } = req.user;
    if (isEmpty(amount) || isNaN(amount)) return res.status(400).json({ status: false, message: "A valid amount is required.", });
    if (Number(amount) <= 0) return res.status(400).json({ status: false, message: "Amount must be greater than 0.", });
    // Validate levels
    if (fromLevel < 1 || fromLevel > 10 || toLevel < 1 || toLevel > 10) return res.status(400).json({ status: false, message: 'Invalid levels' });
    if (fromLevel == toLevel) return res.status(400).json({ status: false, message: 'Both levels are same.' });
    const time = Math.floor(Date.now() / 1000);
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        // 1. Check user exists and is not blocked (with FOR UPDATE lock)
        const [[user]] = await conn.execute(`SELECT income, block FROM user WHERE userid = ? LIMIT 1`, [userid]);
        if (!user) {
            await conn.rollback();
            return res.status(400).json({ status: false, message: "User not found" });
        }
        if (user.block !== 0) {
            await conn.rollback();
            return res.status(400).json({ status: false, message: "Your account is blocked." });
        }
        // 2. Check if target level is not already upgraded
        const [hasTargetLevel] = await conn.execute(
            `SELECT 1 FROM user_levels WHERE userid = ? AND level = ? AND is_active = TRUE`,
            [userid, Number(toLevel) + 1]
        );
        console.log(hasTargetLevel, 'hasTargetLevel');
        if (hasTargetLevel.length) {
            await conn.rollback();
            return res.status(400).json({ status: false, message: 'Target level already upgraded' });
        }
        const [hasTargetLevelShift] = await conn.execute(
            `SELECT 1 FROM user_levels 
             WHERE userid = ? AND level = ? AND is_active = TRUE`,
            [userid, toLevel]
        );
        if (hasTargetLevelShift.length == 0) {
            await conn.rollback();
            return res.status(400).json({ status: false, message: 'Target level not upgraded' });
        }
        // 3. Calculate amount needed
        const [[targetPower]] = await conn.execute(`SELECT amount FROM user_upgrade_power  WHERE userid = ? AND level = ? LIMIT 1`, [userid, toLevel]);
        const currentPower = targetPower ? targetPower.amount : 0;
        const [[level_amount]] = await conn.execute(`SELECT amount FROM levels WHERE level=?`, [Number(toLevel) + 1]);
        const neededAmount = parseFloat(level_amount?.amount) - parseFloat(currentPower);
        if (neededAmount == 0) return res.status(400).json({ status: false, message: "No transfer needed - target level already has sufficient funds" });

        // // 4. Check source power
        const [[sourcePower]] = await conn.execute(
            `SELECT amount FROM user_upgrade_power
             WHERE userid = ? AND level = ? LIMIT 1`,
            [userid, fromLevel]
        );

        if (!sourcePower || parseFloat(sourcePower.amount) < amount) {
            await conn.rollback();
            return res.status(400).json({ status: false, message: 'Insufficient power in source level' });
        }
        // 5. Update source level
        await conn.execute(`UPDATE user_upgrade_power SET amount = amount - ?  WHERE userid = ? AND level = ?`, [amount, userid, fromLevel]);

        // 6. Update target level
        await conn.execute(
            `INSERT INTO user_upgrade_power (userid, level, amount, time)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE amount = amount + ?`,
            [userid, toLevel, amount, time, amount]
        );
        // 7. Record transaction
        const txId = await trx_id();
        await conn.execute(
            `INSERT INTO transaction_history 
             (userid, transaction_id, transaction_type, power, old_power, current_power, level, upgrade_level,sender_id, datetime)
             VALUES (?, ?, 'shift_power', ?, ?, ?, ?, ?, ?,?)`,
            [userid, txId, amount, sourcePower.amount, parseFloat(sourcePower.amount) + parseFloat(amount), fromLevel, toLevel, userid, time]
        );
        // Add notification history
        await conn.execute(
            `INSERT INTO notification_history 
             (userid, action, type, status, time) 
             VALUES (?, ?, ?, ?, ?)`,
            [userid, `Congrats! You have shift power from Level ${fromLevel} to Level ${toLevel}.`, "shift_power", 0, time]
        );
        await conn.commit();
        res.status(200).json({ status: true, fromLevel, toLevel, amount: amount, message: 'Power shifted successfully' });
    } catch (error) {
        await conn.rollback();
        console.error('Shift power error:', error);
        res.status(500).json({ status: false, message: 'Shift power failed' });
    } finally {
        conn.release();
    }
});

// Shift Power (partener)------------------------------
router.post('/shift-power-partener', verifyToken, async (req, res) => {
    const { fromLevel, toLevel, amount } = req.body;
    const { userid } = req.user;
    // Validate levels
    if (fromLevel < 1 || fromLevel > 10 || toLevel < 1 || toLevel > 10) return res.status(400).json({ status: false, message: 'Invalid levels' });
    if (fromLevel == toLevel) return res.status(400).json({ status: false, message: 'Both levels are same.' });
    if (isEmpty(amount) || isNaN(amount)) return res.status(400).json({ status: false, message: "A valid amount is required.", });
    if (Number(amount) <= 0) return res.status(400).json({ status: false, message: "Amount must be greater than 0.", });

    const time = Math.floor(Date.now() / 1000);
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        // 1. Check user exists and is not blocked (with FOR UPDATE lock)
        const [[user]] = await conn.execute(`SELECT income, block FROM user WHERE userid = ? LIMIT 1`, [userid]);
        if (!user) {
            await conn.rollback();
            return res.status(400).json({ status: false, message: "User not found" });
        }
        if (user.block !== 0) {
            await conn.rollback();
            return res.status(400).json({ status: false, message: "Your account is blocked." });
        }
        // 2. Check if target level is not already upgraded
        const [hasTargetLevel] = await conn.execute(
            `SELECT 1 FROM partner_levels WHERE userid = ? AND level = ? AND is_active = TRUE`,
            [userid, Number(toLevel) + 1]
        );
        if (hasTargetLevel.length) {
            await conn.rollback();
            return res.status(400).json({ status: false, message: 'Target level already upgraded' });
        }
        const [hasTargetLevelUpgrade] = await conn.execute(
            `SELECT 1 FROM partner_levels WHERE userid = ? AND level = ? AND is_active = TRUE`,
            [userid, Number(toLevel)]
        );
        if (hasTargetLevelUpgrade.length == 0) return res.status(400).json({ status: false, message: "Level not upgraded; therefore, you shift power." })
        // 3. Calculate amount needed
        const [[targetPower]] = await conn.execute(`SELECT amount FROM partner_upgrade_power  WHERE userid = ? AND level = ? LIMIT 1`, [userid, toLevel]);

        const currentPower = targetPower ? targetPower.amount : 0;
        const [[level_amount]] = await conn.execute('SELECT amount FROM levels WHERE level=?', [Number(toLevel) + 1]);
        const neededAmount = parseFloat(level_amount.amount) - parseFloat(currentPower);
        if (neededAmount == 0) return res.status(400).json({ status: false, message: "No transfer needed - target level already has sufficient funds" });

        // 4. Check source power
        const [[sourcePower]] = await conn.execute(
            `SELECT amount FROM partner_upgrade_power WHERE userid = ? AND level = ? LIMIT 1`,
            [userid, fromLevel]
        );
        if (!sourcePower || sourcePower.amount < amount) {
            await conn.rollback();
            return res.status(400).json({ status: false, message: 'Insufficient power in source level' });
        }
        // 5. Update source level
        await conn.execute(`UPDATE partner_upgrade_power SET amount = amount - ?  WHERE userid = ? AND level = ?`, [amount, userid, fromLevel]);

        // 6. Update target level
        await conn.execute(
            `INSERT INTO partner_upgrade_power (userid, level, amount, time)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE amount = amount + ?`,
            [userid, toLevel, amount, time, amount]
        );
        // 7. Record transaction
        const txId = await trx_id();
        await conn.execute(
            `INSERT INTO transaction_history 
             (userid, transaction_id, transaction_type, power, old_power, current_power, level, upgrade_level,sender_id, datetime)
             VALUES (?, ?, 'shift_partner_power', ?, ?, ?, ?, ?, ?,?)`,
            [userid, txId, amount, sourcePower.amount, parseFloat(sourcePower.amount) + parseFloat(amount), fromLevel, toLevel, userid, time]
        );
        // Add notification history
        await conn.execute(
            `INSERT INTO notification_history 
             (userid, action, type, status, time) 
             VALUES (?, ?, ?, ?, ?)`,
            [userid, `Congrats! You have shift partner power from Level ${fromLevel} to Level ${toLevel}.`, "shift_power", 0, time]
        );
        await conn.commit();
        res.status(200).json({ status: true, fromLevel, toLevel, amount: amount, message: 'Power shifted successfully' });
    } catch (error) {
        await conn.rollback();
        console.error('Shift power error:', error);
        res.status(500).json({ status: false, message: 'Shift power failed', details: error.message });
    } finally {
        conn.release();
    }
});
// Transfer Power to Another User-------------------
router.post('/transfer-power', verifyToken, async (req, res) => {
    const { fromLevel, amount, toUserId, toLevel } = req.body;
    const { userid } = req.user;
    console.log(userid, 'userid-------------');
    if (isEmpty(toUserId)) return res.status(400).json({ status: false, message: "Target userId is required.", });
    if (isEmpty(amount) || isNaN(amount)) return res.status(400).json({ status: false, message: "A valid amount is required.", });
    if (Number(amount) <= 0) return res.status(400).json({ status: false, message: "Amount must be greater than 0.", });
    // Validate levels
    if (fromLevel < 1 || fromLevel > 10 || toLevel < 1 || toLevel > 10) {
        return res.status(400).json({ status: false, message: 'Invalid levels' });
    }
    //check user don't transfer self
    if (userid == toUserId) return res.status(400).json({ status: false, message: "You don't transfer yourself" });

    const time = Math.floor(Date.now() / 1000);
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Check user exists and is not blocked (with FOR UPDATE lock)
        const [[user]] = await conn.execute(`SELECT income, block FROM user WHERE userid = ? LIMIT 1`, [userid]);
        if (!user) {
            await conn.rollback();
            return res.status(400).json({ status: false, message: "User not found" });
        }
        if (user.block !== 0) {
            await conn.rollback();
            return res.status(400).json({ status: false, message: "Your account is blocked." });
        }
        // 2. Check if target user exists
        const [[targetUser]] = await conn.execute(`SELECT 1 FROM user WHERE userid = ? LIMIT 1`, [toUserId]);
        if (!targetUser) {
            await conn.rollback();
            return res.status(400).json({ status: false, message: "Target user not found" });
        }
        // 3. Check if target level is not already upgraded
        const [hasTargetLevel] = await conn.execute(
            `SELECT 1 FROM user_levels WHERE userid = ? AND level = ? AND is_active = TRUE`,
            [toUserId, toLevel + 1]
        );
        if (hasTargetLevel.length) {
            await conn.rollback();
            return res.status(400).json({ status: false, message: 'Target level already upgraded' });
        }
        const [[receiPower]] = await conn.execute(
            `SELECT amount FROM user_upgrade_power WHERE userid = ? AND level = ? LIMIT 1`,
            [toUserId, toLevel]
        );
        const receiverPower = receiPower.length > 0 ? receiPower.amount : 0;

        // 4. Check source power
        const [[sourcePower]] = await conn.execute(
            `SELECT amount FROM user_upgrade_power WHERE userid = ? AND level = ? LIMIT 1`,
            [userid, fromLevel]
        );
        if (!sourcePower || parseFloat(sourcePower.amount) < parseFloat(amount)) {
            await conn.rollback();
            return res.status(400).json({ status: false, message: 'Insufficient power in source level' });
        }
        // 5. Update source level
        await conn.execute(
            `UPDATE user_upgrade_power SET amount = amount - ? WHERE userid = ? AND level = ?`,
            [amount, userid, fromLevel]
        );

        // 6. Update target level
        await conn.execute(
            `INSERT INTO user_upgrade_power (userid, level, amount, time)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE amount = amount + ?`,
            [toUserId, toLevel, amount, time, amount]
        );

        // 7. Record transaction
        const txId = await trx_id();
        const txIdReci = await trx_id();
        await conn.execute(
            `INSERT INTO transaction_history 
             (userid, transaction_id, transaction_type, power, old_power, current_power,level,upgrade_level,sender_id, datetime)
             VALUES (?, ?, 'power_transfer', ?, ?, ?, ?,?,?,?)`,
            [userid, txId, amount, sourcePower.amount, parseFloat(sourcePower.amount) - parseFloat(amount), fromLevel, toLevel, toUserId, time,]
        );
        await conn.execute(
            `INSERT INTO transaction_history 
             (userid, transaction_id, transaction_type, power, old_power, current_power, level,upgrade_level,sender_id, datetime)
             VALUES (?, ?, 'power_receive', ?, ?, ?, ?,?,?,?)`,
            [toUserId, txIdReci, amount, receiverPower, parseFloat(receiverPower) + parseFloat(amount), fromLevel, toLevel, toUserId, time,]
        );
        // Add notification history
        await conn.execute(
            `INSERT INTO notification_history 
             (userid, action, type, status, time) 
             VALUES (?, ?, ?, ?, ?)`,
            [userid, `Congrats! You have transfer power to user ${toUserId}.`, "transfer_power", 0, time]
        );
        await conn.execute(
            `INSERT INTO notification_history 
             (userid, action, type, status, time) 
             VALUES (?, ?, ?, ?, ?)`,
            [userid, `Congrats! You have received power to user ${toUserId}.`, "received_power", 0, time]
        );
        await conn.commit();
        res.status(200).json({ status: true, fromLevel, toLevel, toUserId, amount, message: 'Power transferred successfully' });
    } catch (error) {
        await conn.rollback();
        console.error('Transfer power error:', error);
        res.status(500).json({ status: false, message: 'Transfer power failed', });
    } finally {
        conn.release();
    }
});

//Transfer Power to Another partener-------------------
router.post('/transfer-power-partener', verifyToken, async (req, res) => {
    const { fromLevel, amount, toUserId, toLevel } = req.body;
    const { userid } = req.user;

    // Validate input
    if (!toUserId || toUserId.trim() === '') return res.status(400).json({ status: false, message: "Recipient user ID is required." });
    if (!amount || isNaN(amount)) return res.status(400).json({ status: false, message: "A valid numeric amount is required." });
    const numericAmount = parseFloat(amount);
    if (numericAmount <= 0) return res.status(400).json({ status: false, message: "Amount must be greater than 0." });

    // Validate levels
    if (isNaN(fromLevel) || isNaN(toLevel) || fromLevel < 1 || fromLevel > 10 || toLevel < 1 || toLevel > 10) {
        return res.status(400).json({ status: false, message: 'Levels must be between 1 and 10' });
    }
    // Prevent self-transfer
    if (userid === toUserId) return res.status(400).json({ status: false, message: "Cannot transfer power to yourself" });
    const time = Math.floor(Date.now() / 1000);
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Check sender status (with FOR UPDATE lock)
        const [[sender]] = await conn.execute(`SELECT income, block, is_partner FROM user WHERE userid = ? LIMIT 1`, [userid]);
        if (!sender) {
            await conn.rollback();
            return res.status(404).json({ status: false, message: "Your account not found" });
        }
        if (sender.block !== 0) {
            await conn.rollback();
            return res.status(403).json({ status: false, message: "Your account is blocked" });
        }

        // 2. Check recipient exists and is active (with FOR UPDATE lock)
        const [[recipient]] = await conn.execute(`SELECT income, block FROM user WHERE userid = ? LIMIT 1`, [toUserId]);
        if (!recipient) {
            await conn.rollback();
            return res.status(404).json({ status: false, message: "Recipient user not found" });
        }
        if (recipient.block !== 0) {
            await conn.rollback();
            return res.status(403).json({ status: false, message: "Recipient account is blocked" });
        }

        // 3. Check recipient's target level status
        const [hasTargetLevel] = await conn.execute(
            `SELECT 1 FROM partner_levels WHERE userid = ? AND level = ? AND is_active = TRUE`,
            [toUserId, Number(toLevel) + 1]
        );
        if (hasTargetLevel.length) {
            await conn.rollback();
            return res.status(400).json({ status: false, message: 'Recipient has already upgraded beyond target level' });
        }

        // 4. Check recipient has the base level activated
        const [hasBaseLevel] = await conn.execute(
            `SELECT 1 FROM partner_levels
             WHERE userid = ? AND level = ? AND is_active = TRUE`,
            [toUserId, toLevel]
        );
        if (!hasBaseLevel.length) {
            await conn.rollback();
            return res.status(400).json({ status: false, message: `Recipient hasn't activated level ${toLevel} yet` });
        }
        const [[receiverPower]] = await conn.execute(
            `SELECT amount,id FROM partner_upgrade_power
             WHERE userid = ? AND level = ? LIMIT 1`,
            [toUserId, toLevel]
        );
        const receiverBalance = receiverPower.length > 0 ? receiverPower.amount : 0;

        // 5. Check sender's power balance (with FOR UPDATE lock)
        const [[senderPower]] = await conn.execute(
            `SELECT amount,id FROM partner_upgrade_power
             WHERE userid = ? AND level = ? LIMIT 1`,
            [userid, fromLevel]
        );

        if (!senderPower) {
            await conn.rollback();
            return res.status(400).json({ status: false, message: `No power found in your level ${fromLevel}` });
        }

        const senderBalance = parseFloat(senderPower.amount);
        if (senderBalance < numericAmount) {
            await conn.rollback();
            return res.status(400).json({ status: false, message: `Insufficient power in your level ${fromLevel}` });
        }

        // 6. Deduct from sender
        await conn.execute(
            `UPDATE partner_upgrade_power SET amount = amount - ? WHERE userid = ? AND level = ?`,
            [numericAmount, userid, fromLevel]
        );

        // 7. Add to recipient
        await conn.execute(
            `INSERT INTO partner_upgrade_power
             (userid, level, amount, time)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
             amount = amount + ?`,
            [toUserId, toLevel, numericAmount, time, numericAmount]
        );

        // 8. Record transactions
        const txId = await trx_id();
        const txIdRecipient = await trx_id();

        // Sender's transaction
        await conn.execute(
            `INSERT INTO transaction_history
            (userid, transaction_id, transaction_type, power, old_power, current_power,level,upgrade_level,sender_id, datetime)
             VALUES (?, ?, 'power_transfer_partener', ?, ?, ?, ?,?,?,?)`,
            [userid, txId, numericAmount, senderBalance, senderBalance - numericAmount, fromLevel, toLevel, toUserId, time]
        );
        await conn.execute(
            `INSERT INTO transaction_history 
             (userid, transaction_id, transaction_type, power, old_power, current_power,level,upgrade_level,sender_id, datetime)
             VALUES (?, ?, 'power_receive_partener', ?, ?, ?, ?,?,?,?)`,
            [toUserId, txIdRecipient, numericAmount, receiverBalance, parseFloat(receiverBalance) - parseFloat(amount), fromLevel, toLevel, userid, time,]
        );

        // 9. Add notifications
        await conn.execute(
            `INSERT INTO notification_history 
             (userid, action, type, status, time) 
             VALUES (?, ?, ?, ?, ?)`,
            [userid, `You transferred ${numericAmount} power to user ${toUserId} (Level ${toLevel}).`,
                "power_transfer", 0, time]
        );

        await conn.execute(
            `INSERT INTO notification_history 
             (userid, action, type, status, time) 
             VALUES (?, ?, ?, ?, ?)`,
            [toUserId, `You received ${numericAmount} power from user ${userid} (Level ${fromLevel}).`,
                "power_received", 0, time]
        );

        await conn.commit();

        return res.status(200).json({
            status: true,
            data: {
                fromLevel,
                toLevel,
                toUserId,
                amount: numericAmount,
                remainingBalance: senderBalance - numericAmount
            },
            message: 'Power transferred successfully'
        });

    } catch (error) {
        await conn.rollback();
        console.error('Transfer power error:', error);

        if (error.code === 'ER_LOCK_WAIT_TIMEOUT') {
            return res.status(503).json({ status: false, message: 'System busy. Please try again later.' });
        }
        return res.status(500).json({ status: false, message: 'Power transfer failed', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
    } finally {
        conn.release();
    }
});
//exam passed for become partner-------------------
router.post('/exam_passed', verifyToken, async (req, res) => {
    const { userid } = req.user;
    console.log(userid, 'userid');
    // Prevent self-transfer
    const conn = await pool.getConnection();
    try {
        const time = Math.floor(Date.now() / 1000);
        await conn.beginTransaction();

        // 1. Check user status (with FOR UPDATE lock)
        const [[user]] = await conn.execute(
            `SELECT income, block, is_partner, is_qualified, is_examPassed, is_top_approved, referred_users FROM user
             WHERE userid = ? LIMIT 1`,
            [userid]
        );

        if (!user) {
            await conn.rollback();
            return res.status(404).json({ status: false, message: "User does not exiest." });
        }
        if (user.block !== 0) {
            await conn.rollback();
            return res.status(403).json({ status: false, message: "Your account is blocked." });
        }
        else if (user.is_partner !== 0) {
            await conn.rollback();
            return res.status(403).json({ status: false, message: "You are already a partner." });
        }
        else if (user.is_top_approved !== 0) {
            await conn.rollback();
            return res.status(403).json({ status: false, message: "The user is already allowed for top-approved access." });
        }
        else if (user.is_qualified === 1) {
            await conn.rollback();
            return res.status(403).json({ status: false, message: "The user is already qualified for partener." });
        }
        else if (user.is_qualified === 2) {
            await conn.rollback();
            return res.status(403).json({ status: false, message: "The user is already rejected for partener." });
        }
        else if (user.is_examPassed !== 0) {
            await conn.rollback();
            return res.status(403).json({ status: false, message: "The user has already passed the exam." });
        }

        /// get require refferal to become partner
        const [[system_settings]] = await conn.execute(`SELECT partner_referral_required,is_top_approving,partner_fee FROM system_settings ORDER BY id DESC LIMIT 1`);
        if (user.referred_users < system_settings.partner_referral_required) {
            await conn.rollback();
            return res.status(403).json({ status: false, message: "The user qualifies for the exam after 3 or more referrals." });
        }

        // const istops = system_settings.is_top_approving == 1 ? 1 : 2;
        const [update] = system_settings.is_top_approving == 1
            ? await conn.execute(`UPDATE user SET is_examPassed =?, is_top_approved=? WHERE userid = ?`, [1, 1, userid])
            : await conn.execute(`UPDATE user SET is_examPassed =?, is_top_approved=?,is_qualified=? WHERE userid = ?`, [1, 2, 1, userid]);

        // update the user's is_examPassed
        // const [update] = await conn.execute(`UPDATE user SET is_examPassed =?, is_top_approved=? WHERE userid = ?`, [1, istops, userid]);
        if (!update.affectedRows) {
            await conn.rollback();
            return res.status(403).json({ status: false, message: "Something went wrong. Please try again." });
        };

        const mailMessage = system_settings.is_top_approving == 1
            ? "Congrats! You've passed the partner exam. Awaiting top approval."
            : `Congrats! You've passed the partner exam. Complete your process by paying ${parseFloat(system_settings.partner_fee).toFixed(4)} partner fees.`;

        ///save notification
        await conn.execute(
            `INSERT INTO notification_history 
             (userid, action, type, status, time) 
             VALUES (?, ?, ?, ?, ?)`,
            [userid, mailMessage, "is_examPassed", 0, time]
        );

        await conn.commit();
        return res.status(200).json({
            status: true,
            is_examPassed: 1,
            message: "Congrats! You have successfully passed the exam to become a partner."
        });
    } catch (error) {
        await conn.rollback();
        console.error('is_examPassed updation error:', error);

        if (error.code === 'ER_LOCK_WAIT_TIMEOUT') {
            return res.status(503).json({ status: false, message: 'System busy. Please try again later.' });
        }
        return res.status(500).json({ status: false, message: 'Something went wrong.Please try again.', });
    } finally {
        conn.release();
    }
});

//------------------Qualify User for Partnership by upper partner------------
router.post('/approved_user', verifyToken, async (req, res) => {
    const { userid } = req.user;
    const { approval_userid, status } = req.body;
    if (isEmpty(approval_userid)) return res.status(400).json({ status: false, message: "Please reuired user ID." })
    if (![1, 2].includes(status)) return res.status(400).json({ status: false, message: "Please provide correct status approve or reject." });

    // Prevent self-transfer
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const time = Math.floor(Date.now() / 1000);

        // 1. Check user status (with FOR UPDATE lock)
        const [[user]] = await conn.execute(
            `SELECT income, block, is_partner, referred_users,is_top_approved FROM user WHERE userid = ? LIMIT 1`,
            [userid]
        );
        if (!user) {
            await conn.rollback();
            return res.status(404).json({ status: false, message: "User does not exiest." });
        }
        if (user.block !== 0) {
            await conn.rollback();
            return res.status(403).json({ status: false, message: "Your account is blocked." });
        }
        else if (user.is_partner == 0) {
            await conn.rollback();
            return res.status(403).json({ status: false, message: "You are not a partner." });
        }
        // 1. Check approvalUser status (with FOR UPDATE lock)
        const [[approvalUser]] = await conn.execute(
            `SELECT block, coreferrer_code, is_qualified, is_examPassed, is_top_approved, referred_users FROM user
             WHERE userid = ? LIMIT 1`,
            [approval_userid]
        );
        if (!approvalUser) {
            await conn.rollback();
            return res.status(404).json({ status: false, message: "User does not exiest." });
        }
        if (approvalUser.block !== 0) {
            await conn.rollback();
            return res.status(403).json({ status: false, message: "Your account is blocked." });
        };
        // if (approvalUser.is_examPassed == 0) {
        //     await conn.rollback();
        //     return res.status(403).json({ status: false, message: "User dose not passed the exam." });
        // };
        const mess = status == 1 ? "User alreay qualified." : "User alreay Rejected."
        if (approvalUser.is_qualified == status) {
            await conn.rollback();
            return res.status(403).json({ status: false, message: mess });
        };
        if (approvalUser.is_top_approved == 2) {
            await conn.rollback();
            return res.status(403).json({ status: false, message: "The user doesn't need to be qualified." });
        };
        if (userid != approvalUser.coreferrer_code) {
            await conn.rollback();
            return res.status(403).json({ status: false, message: "You are not a coreffral of this user." });
        }

        const notiMessage = status == 1
            ? "Congrats! You are now approved to become a partner. Complete your process by paying partner fees."
            : "Sorry, your application to become a partner has been rejected.";

        // update the user's is_examPassed
        const [update] = await conn.execute(`UPDATE user SET is_qualified =? WHERE userid = ?`, [status, approval_userid]);
        if (!update.affectedRows) {
            await conn.rollback();
            return res.status(403).json({ status: false, message: "Something went wrong. Please try again." });
        }
        ///save notification
        await conn.execute(
            `INSERT INTO notification_history 
             (userid, action, type, status, time) 
             VALUES (?, ?, ?, ?, ?)`,
            [approval_userid, notiMessage, "is_approvedUser", 0, time]
        );

        await conn.commit();
        return res.status(200).json({
            status: true,
            message: "Approved successfully."
        });
    } catch (error) {
        await conn.rollback();
        console.error('error accure in approved user:', error);

        if (error.code === 'ER_LOCK_WAIT_TIMEOUT') {
            return res.status(503).json({ status: false, message: 'System busy. Please try again later.' });
        }
        return res.status(500).json({ status: false, message: 'Something went wrong.Please try again.', });
    } finally {
        conn.release();
    }
});
router.post('/find_partner_user', verifyToken, async (req, res) => {
    const { userid } = req.user;
    const { find_userid } = req.body;
    if (isEmpty(userid)) return res.status(400).json({ status: false, message: "Please login first." })
    if (isEmpty(find_userid)) return res.status(400).json({ status: false, message: "user ID required." })
    try {
        const time = Math.floor(Date.now() / 1000);
        // 1. Check user status (with FOR UPDATE lock)
        const [[user]] = await pool.execute(
            `SELECT income, block, is_partner, referred_users,is_top_approved FROM user WHERE userid = ? LIMIT 1`,
            [userid]
        );
        if (!user) return res.status(404).json({ status: false, message: "User does not exiest." });
        if (user.block !== 0) return res.status(403).json({ status: false, message: "Your account is blocked." });

        let [partner_user] = await pool.execute("SELECT userid,user_name,user_email,country_code,mobile_no,income,level_income_received,coreferrer_code,referred_users,coreferred_users,registration_date,selfie,wallet_Address,is_partner,is_qualified,is_top_approved FROM `user` WHERE coreferrer_code=? AND status !=? order by id desc", [find_userid, 0]);
        if (!partner_user) return res.status(404).json({ status: false, message: "Patner data not found." });

        return res.status(200).json({
            status: true,
            message: "Partner data fatched successfully.",
            data: partner_user,
        });
    } catch (error) {
        console.error('error accure in find partner user:', error);
        return res.status(500).json({ status: false, message: 'Something went wrong.Please try again.', });
    }
});
router.post('/find_user', verifyToken, async (req, res) => {
    const { userid } = req.user;
    const { find_userid } = req.body;
    if (isEmpty(userid)) return res.status(400).json({ status: false, message: "Please login first." })
    if (isEmpty(find_userid)) return res.status(400).json({ status: false, message: "user ID required." })
    try {
        const time = Math.floor(Date.now() / 1000);
        // 1. Check user status (with FOR UPDATE lock)
        const [[user]] = await pool.execute(
            `SELECT income, block, is_partner, referred_users,is_top_approved FROM user WHERE userid = ? LIMIT 1`,
            [userid]
        );
        if (!user) return res.status(404).json({ status: false, message: "User does not exiest." });
        if (user.block !== 0) return res.status(403).json({ status: false, message: "Your account is blocked." });

        let [partner_user] = await pool.execute("SELECT userid,user_name,user_email,country_code,mobile_no,income,level_income_received,reffereral_code,coreferrer_code,referred_users,coreferred_users,registration_date,selfie,wallet_Address,is_partner,is_qualified,is_top_approved FROM `user` WHERE reffereral_code=? AND status !=? order by id desc", [find_userid, 0]);
        if (!partner_user) return res.status(404).json({ status: false, message: "User data not found." });

        return res.status(200).json({
            status: true,
            message: "Partner data fatched successfully.",
            data: partner_user,
        });
    } catch (error) {
        console.error('error accure in find user:', error);
        return res.status(500).json({ status: false, message: 'Something went wrong.Please try again.', });
    }
});





module.exports = router;

