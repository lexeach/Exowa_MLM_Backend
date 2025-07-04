const { encryptPassword, decryptPassword } = require("../controllers/passwordAuthenticate");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const sendMail = require("../controllers/sendMail");
const router = require("express").Router();
const { pool } = require("../dbConnection/index");
const verifyToken = require("../middleware/verifyToken");
const path = require("path");
const multer = require("multer");
const { checkteam } = require("../controllers/checkteam.js");
const saveUserNotifications = require("../controllers/saveUserNotifications.js");
const { createAdminId, trx_id } = require("../controllers/createRandomNum.js");
const { isEmpty, isEmail, validatePassword, isValidPhoneNumber, validateEmpty } = require("../middleware/validation.js");
const image_path = process.env.image_url;
const support_email = process.env.support_email;
const help_link = process.env.help_link;
const indiaTime = new Date().toLocaleString("en-GB", { timeZone: "Asia/Kolkata", hour12: false, });
const [datePart, timePart] = indiaTime.split(', ');
const time = `${datePart.split('/').reverse().join('-')} ${timePart}`;
const Time = Math.floor(Date.now() / 1000);
const con = pool;

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
router.post("/register", async (req, res, next) => {
    let { fullname, email, password, role } = req.body;
    try {
        // Custom validations
        if (isEmpty(fullname)) return res.status(400).json({ error: "Please provide full name." });
        if (isEmpty(email)) return res.status(400).json({ error: "Please Provide email" });
        if (!isEmail(email)) return res.status(400).json({ error: "Please Provide a valid email" });
        if (isEmpty(password)) return res.status(400).json({ error: "Please Provide password" });
        if (!validatePassword(password)) return res.status(400).json({ error: "Password must be at least 8 characters long, contain an uppercase letter, a lowercase letter, a number, and a special symbol." });
        if (isEmpty(role)) return res.status(400).json({ error: "Please provide role." });
        // Database validations
        let [isExists] = await con.execute("SELECT * FROM `admin_register` WHERE `admin_email`=?", [email]);
        if (isExists.length > 0) return res.status(400).json({ error: "User already Exists" });
        // Generate user ID, referral code, and other necessary data
        const userid = await createAdminId();
        const encPass = await encryptPassword(password);
        // Insert user into the database
        let [row] = await con.execute("INSERT INTO `admin_register` (`admin_id`,`admin_name`, `admin_email`, `admin_password`,`admin_role`, `status`,`created_at`) VALUES (?,?,?,?,?,?,?)", [
            userid,
            fullname,
            email,
            encPass,
            role,
            '0',
            time,
        ]);
        if (row.insertId) {
            return res.status(200).json({ message: "Registered successfully", data: userid });
        } else {
            // Rollback if account insertion fails
            const [deleted] = await con.execute("DELETE FROM `admin_register` WHERE `id`=?", [row.insertId]);
            if (deleted.affectedRows) return res.status(400).json({ message: "Something went wrong while creating your account, please try again" });
        }
    } catch (err) {
        console.log(err, " errerr");
        next(err);
    }
});
router.post("/login", async (req, res, next) => {
    const { userid, admin_password } = req.body;
    if (isEmpty(userid)) return res.status(400).json({ error: "Please provide user id" });
    try {
        const [block] = await con.execute("SELECT * FROM `admin_register` WHERE `admin_id`=?", [userid]);
        if (block.length) {
            if (block[0].block == 1) return res.status(400).json({ error: "You are blocked please contact the support team" });
            if (block[0].status == 0) return res.status(400).json({ error: 'Your account not verified by admin. Please contact admin.' });
        }
        if (!admin_password) return res.status(400).json({ error: "Please provide your password" });
        const [exists] = await con.execute("SELECT `admin_id`, `admin_email`, `admin_name`, `admin_role`, `status` FROM `admin_register` WHERE `admin_id`=?", [userid]);
        if (exists.length == 0) {
            return res.status(403).json({ error: "User does not exits" });
        }

        // CHECK ATTEMPTS
        if (exists[0].attempt > 2) {
            return res.status(400).json({ error: "You are blocked please contact the support team" });
        }

        const [isblock] = await con.execute("SELECT * FROM `admin_register` WHERE `admin_id`=? AND block=1", [userid]);
        if (isblock.length > 0) {
            return res.status(400).json({ error: "You are blocked please contact the support team" });
        }
        const isAuthUser = await decryptPassword(admin_password, block[0].admin_password);
        if (isAuthUser) {
            const jwtToken = jwt.sign({ user: exists[0], exp: Math.floor(Date.now() / 1000) + parseFloat(process.env.JWT_EXPIRES_IN) * 3600 }, process.env.JWT_SECRET);
            const [route] = await con.execute("SELECT fr.routes_path FROM routes_admin ra JOIN file_routes fr ON ra.routes_id = fr.id WHERE ra.admin_id =?", [userid]);
            return res.status(200).json({ result: { user: exists[0], token: jwtToken, routes: route } });
        } else {
            let attempts = 1 + exists[0].attempt;
            await con.execute("UPDATE `admin_register` SET `attempt`=? WHERE admin_id=?", [attempts, exists[0].admin_id]);
            if (attempts == 3) {
                await con.execute("UPDATE `admin_register` SET `block`=1 WHERE admin_id=?", [exists[0].admin_id]);
            }
            return res.status(401).json({ error: "User Id and password is not matched" });
        }
    } catch (err) {
        console.log(err, " errerr");
        next(err);
    }
});
// ................forget password.....................
router.post("/forgetAppPassword", async (req, res, next) => {
    const { userid } = req.body;
    let message = validateEmpty(req.body);
    if (message) return res.status(400).json({ error: message });
    try {
        const [exists] = await con.execute("SELECT * FROM `admin_register` WHERE `admin_id`=?", [userid]);
        if (exists.length == 0) {
            return res.status(403).json({ error: "You are not registered!" });
        }
        if (exists[0].block > 0) return res.status(400).json({ error: "You are blocked please contact the support team" });
        const otp = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
        const [existsOtp] = await con.execute("SELECT * FROM `admin_register` WHERE `otp`=?", [otp]);
        if (existsOtp.length) return res.status(400).json({ error: "Internal server error,Plase try again!" });
        let [resend] = await con.execute("UPDATE `admin_register` SET `otp`=? , `attempt`='0', otp_created_at = ? WHERE admin_id=?", [otp, time, exists[0].admin_id]);
        let { message } = require("../templates/otp.js");
        const forgotpassword = require("../templates/forgotpassword.js");
        await sendMail("Forget Password", forgotpassword.message(otp), exists[0].admin_email);
        if (resend.affectedRows) {
            return res.status(200).json({ message: "Please check your email ", userid: exists[0].admin_id });
        } else {
            return res.status(400).json({ error: "Internel Server Error" });
        }
    } catch (err) {
        next(err);
    }
});
router.post("/updateForgetPassword", async (req, res, next) => {
    const { password, otp } = req.body;
    if (!otp) return res.status(400).json({ error: "Please enter otp!" });
    if (!password) return res.status(400).json({ error: "Please enter new password" });
    try {
        const [exists] = await con.execute("SELECT * FROM `admin_register` WHERE `otp`=? AND otp_created_at >= ? - INTERVAL 10 MINUTE", [otp, time]);
        if (exists.length == 0) {
            return res.status(403).json({ error: "Invalid otp!" });
        }
        let encPass = await encryptPassword(password);
        const [udpatePassword] = await con.execute("UPDATE `admin_register` SET `otp`='0',`admin_password`=? WHERE otp=?", [encPass, otp]);
        if (udpatePassword.affectedRows > 0) {
            return res.status(200).json({ message: "Password reset successfully" });
        } else {
            return res.status(400).json({ error: "Internel Server Error" });
        }
    } catch (err) {
        next(err);
    }
});
// ------------- list of admins ----------------------
router.post("/admin_list", verifyToken, async (req, res, next) => {
    const { admin_role } = req.user.user;

    try {
        // Optimized query with JOIN and GROUP_CONCAT for efficiency
        const query = `
    SELECT 
        ar.admin_id, ar.admin_email, ar.admin_name, ar.admin_role, ar.status, ar.block, 
        COALESCE(GROUP_CONCAT(ra.routes_id), '') AS routes
    FROM admin_register ar
    LEFT JOIN routes_admin ra ON ar.admin_id = ra.admin_id
    WHERE ar.admin_role != 'Admin' ${admin_role !== 'Admin' ? "AND ar.admin_role != 'Team'" : ""}
    GROUP BY ar.admin_id, ar.admin_email, ar.admin_name, ar.admin_role, ar.status, ar.block
`;

        const [admin_list] = await con.execute(query);

        if (admin_list.length === 0) {
            return res.status(200).json({ message: "No support member" });
        }

        // Convert routes from comma-separated string to an array
        const adminData = admin_list.map(admin => ({
            ...admin,
            routes: admin.routes ? admin.routes.split(',').map(Number) : []
        }));

        return res.status(200).json({ data: adminData });

    } catch (err) {
        next(err);
    }
});
// ------------- Support & Team approve ----------------------
router.post("/admin_approve", verifyToken, async (req, res, next) => {
    const { admin_id, status } = req.body;
    if (isEmpty(admin_id)) return res.status(400).json({ error: "Please provide admin id." });
    if (isEmpty(status)) return res.status(400).json({ error: "Please provide status." });
    try {
        const [admin_list] = await con.execute("UPDATE `admin_register` SET `status`=?, `otp_created_at`=? WHERE `admin_id`=?", [status.toString(), time, admin_id]);
        if (admin_list.affectedRows > 0) {
            let messages = status == 1 ? "User aaproved successfully." : "User reject successfully.";
            return res.status(200).json({ message: messages })
        } else {
            return res.status(403).json({ message: "Admin Id doesn't exist" });
        }
    } catch (err) {
        next(err);
    }

});
// ------------- Support & Team block unblock ----------------------
router.post("/admin_block", verifyToken, async (req, res, next) => {
    const { admin_id, status } = req.body;
    if (isEmpty(admin_id)) return res.status(400).json({ error: "Please provide admin id." });
    if (isEmpty(status)) return res.status(400).json({ error: "Please provide status." });
    try {
        const [admin_list] = await con.execute("UPDATE `admin_register` SET `block`=?, `attempt`=0, `otp_created_at`=? WHERE `admin_id`=?", [status, time, admin_id]);
        if (admin_list.affectedRows > 0) {
            const [exists] = await con.execute("SELECT * FROM `admin_register` WHERE `admin_id`=?", [admin_id]);
            let messages = status == 1 ? "User blocked successfully." : "User unblock successfully.";
            let statuss = status == 1 ? "blocked" : "unblock";
            let comment = status == 1 ? "suspicious activity " : "user request";
            return res.status(200).json({ message: messages });
            let { message } = require("../templates/Account_block");
            await sendMail(messages, message(admin_id, exists[0].admin_email, exists[0].admin_name, statuss, comment, time), exists[0].admin_email);

        } else {
            return res.status(403).json({ message: "Admin Id doesn't exist" });
        }
    } catch (err) {
        next(err);
    }

});
// ------------- Support & Team block unblock ----------------------
router.post("/user_block", verifyToken, async (req, res, next) => {
    const { userid, status } = req.body;
    const { admin_id, admin_role } = req.user.user;
    if (isEmpty(userid)) return res.status(400).json({ error: "Please provide user id." });
    if (isEmpty(status)) return res.status(400).json({ error: "Please provide status." });
    try {
        const [exists] = await con.execute("SELECT * FROM `admin_register` WHERE `admin_id`=? AND `status`='1'", [admin_id]);
        if (exists.length == 0) return res.status(403).json({ error: "Admin does not exits" });
        const [existuser] = await con.execute("SELECT * FROM `user` WHERE `userid`=?", [userid]);
        if (existuser.length == 0) return res.status(403).json({ error: "User does not exits" });
        if (admin_role == 'support' && admin_id != existuser[0].agent_name) return res.status(403).json({ error: "You are not authorized for this account." });
        const [admin_list] = await con.execute("UPDATE `user` SET `block`=?, `attempt`=0, `otp_created_at`=? WHERE `userid`=?", [status, time, userid]);
        if (admin_list.affectedRows > 0) {
            let messages = status == 1 ? "User blocked successfully." : "User unblock successfully.";
            let statuss = status == 1 ? "blocked" : "unblock";
            let comment = status == 1 ? "suspicious activity " : "user request";
            return res.status(200).json({ message: messages });
            let { message } = require("../templates/Account_block");
            await sendMail(messages, message(userid, existuser[0].user_email, existuser[0].user_name, statuss, comment, time), existuser[0].user_email);

        } else {
            return res.status(403).json({ message: "User Id doesn't exist" });
        }
    } catch (err) {
        console.log(err)
        next(err);
    }
});
// ------------- user assign----------------------
router.post("/user_assign", verifyToken, async (req, res, next) => {
    const { usersid, adminid } = req.body;
    const { admin_role } = req.user.user;

    if (!adminid) return res.status(400).json({ error: "Please provide admin id." });
    if (!Array.isArray(usersid) || usersid.length === 0) return res.status(400).json({ error: "Please provide user ids." });

    try {
        const [exists] = await con.execute("SELECT * FROM `admin_register` WHERE `admin_id` = ? AND `status` = '1'", [adminid]);
        if (exists.length === 0) return res.status(403).json({ error: "Admin does not exist" });
        if (admin_role === 'support') return res.status(403).json({ error: "You are not authorized for this." });

        const placeholders = usersid.map(() => '?').join(',');
        const query = `UPDATE user SET agent_name = ? WHERE userid IN (${placeholders})`;
        const [admin_list] = await con.execute(query, [adminid, ...usersid]);

        if (admin_list.affectedRows > 0) {
            return res.status(200).json({ message: "User assign successfully." });
        } else {
            return res.status(404).json({ message: "User IDs do not exist" });
        }
    } catch (err) {
        next(err);
    }
});
// ------------- depsoit request list----------------------
router.post("/deposit_request", verifyToken, async (req, res, next) => {
    const { admin_id, admin_role } = req.user.user;
    try {
        const [exists] = await con.execute("SELECT * FROM `admin_register` WHERE `admin_id` = ? AND `status` = '1'", [admin_id]);
        if (exists.length === 0) return res.status(403).json({ error: "Admin does not exist" });
        let dd = admin_role == "support" ? admin_id : admin_role;

        const [deposit_query] = admin_role == "support" ? await con.execute("SELECT u.userid, u.user_name, u.user_email, u.mobile_no, fp.transaction_reference, fp.depositor_name, fp.transaction_id, fp.amount AS payment_amount, fp.amount_dollar, fp.transaction_mode, fp.status, fp.slip_image, fp.comment, fp.date_time, fp.agent_time FROM user u INNER JOIN fiat_payment fp ON u.userid = fp.userid WHERE u.agent_name = ? ORDER BY fp.id DESC", [dd]) : await con.execute("SELECT u.userid, u.user_name, u.user_email, u.mobile_no, fp.transaction_reference, fp.depositor_name, fp.transaction_id, fp.amount AS payment_amount, fp.amount_dollar, fp.transaction_mode, fp.status, fp.slip_image, fp.comment, fp.date_time, fp.agent_time FROM user u INNER JOIN fiat_payment fp ON u.userid = fp.userid ORDER BY fp.id DESC");

        if (deposit_query.length > 0) {
            return res.status(200).json({ data: deposit_query });
        } else {
            return res.status(200).json({ message: "no deposit request" });
        }
    } catch (err) {
        console.log('error ', err);
        next(err);
    }
});
// ------------- depsoit request approval----------------------
router.post("/deposit_approval", verifyToken, async (req, res, next) => {
    const { userid, transaction_id, status, comment } = req.body;
    const { admin_id, admin_role } = req.user.user;
    try {
        const Time = Math.floor(Date.now() / 1000);

        const [exists] = await con.execute("SELECT * FROM `admin_register` WHERE `admin_id` = ? AND `status` = '1'", [admin_id]);
        if (exists.length === 0) return res.status(403).json({ error: "Admin does not exist" });
        const [fiat] = await con.execute("SELECT * FROM `fiat_payment` WHERE `transaction_id`=?", [transaction_id]);
        if (fiat.length == 0) return res.status(403).json({ error: "Transaction request does not exits" });
        if (fiat[0].status != 0) return res.status(403).json({ error: "This request already completed" });
        const [existuser] = await con.execute("SELECT * FROM `user` WHERE `userid`=?", [userid]);
        if (existuser.length == 0) return res.status(403).json({ error: "User does not exits" });
        if (admin_role == 'support' && admin_id != existuser[0].agent_name) return res.status(403).json({ error: "You are not authorized for this account." });
        let updateamount = (parseFloat(fiat[0].amount) + parseFloat(existuser[0].income)).toFixed(4);
        if (admin_role == 'Admin' || admin_role == 'Team') {
            console.log("hello", status, comment, admin_role, time, transaction_id);
            const [dd] = await con.execute("UPDATE `fiat_payment` SET `status` = ?, `comment` = ?, `agent_name` = ?, `agent_time` = ? WHERE `transaction_id` = ?", [status.toString(), comment, admin_role, time, transaction_id]);
            if (dd.affectedRows && status == 1) {
                await con.execute(
                    `UPDATE system_settings SET company_revenue = company_revenue + ?, system_reserve = system_reserve + ? total_distributed = total_distributed + ? ORDER BY id DESC LIMIT 1`,
                    [fiat[0].amount, fiat[0].amount, fiat[0].amount]
                );
                await con.execute("UPDATE `user` SET `income`=? WHERE `userid`=?", [updateamount, existuser[0].userid]);
                await con.execute("INSERT INTO `transaction_history`(`userid`, `transaction_id`, `transaction_type`, `old_balance`, `amount`, `current_balance`, `datetime`) VALUES (?,?,?,?,?,?,?)", [existuser[0].userid, transaction_id, 'Fiat Deposit', existuser[0].income, fiat[0].amount, updateamount, Time]);
                await con.execute("INSERT INTO `notification_history`(`userid`, `action`, `type`, `status`, `time`) VALUES(?,?,?,?,?)", [existuser[0].userid, "Deposit Request Accepted", "istransaction", 0, Time]);
                return res.status(200).json({ message: "Deposit Request Accepted." });
                let { message } = require("../templates/depsoit_request.js");
                await sendMail("Deposit Request Accepted", message(transaction_id, existuser[0].user_name, time, fiat[0].amount, fiat[0].amount_dollar, fiat[0].transaction_mode, fiat[0].transaction_reference, support_email, 'Approved'), existuser[0].user_email);
            } else if (dd.affectedRows && status == 2) {
                await con.execute("INSERT INTO `notification_history`(`userid`, `action`, `type`, `status`, `time`) VALUES(?,?,?,?,?)", [existuser[0].userid, "Deposit Request Rejected", "istransaction", 0, Time]);
                return res.status(200).json({ message: "Deposit Request Rejected." });
                let { message } = require("../templates/deposit_request_rejected.js");
                await sendMail("Deposit Request Rejected", message(transaction_id, existuser[0].user_name, time, fiat[0].amount, fiat[0].amount_dollar, fiat[0].transaction_mode, fiat[0].transaction_reference, support_email, 'Rejected', comment), existuser[0].user_email);

            }
        } else if (admin_role == 'support' && admin_id == existuser[0].agent_name) {
            console.log("hi");
            const [dd] = await con.execute("UPDATE `fiat_payment` SET `status` = ?, `comment` = ?, `agent_name` = ?, `agent_time` = ? WHERE `transaction_id` = ?", [status.toString(), comment, admin_id, time, transaction_id]);
            if (dd.affectedRows && status == '1') {
                await con.execute("UPDATE `user` SET `income`=? WHERE `userid`=?", [updateamount, existuser[0].userid]);
                await con.execute(
                    `UPDATE system_settings SET company_revenue = company_revenue + ?, system_reserve = system_reserve + ? total_distributed = total_distributed + ? ORDER BY id DESC LIMIT 1`,
                    [fiat[0].amount, fiat[0].amount, fiat[0].amount]
                );
                await con.execute("INSERT INTO `transaction_history`(`userid`, `transaction_id`, `transaction_type`, `old_balance`, `amount`, `current_balance`, `datetime`) VALUES (?,?,?,?,?,?,?)", [existuser[0].userid, transaction_id, 'Fiat Deposit', existuser[0].income, fiat[0].amount, updateamount, Time]);
                await con.execute("INSERT INTO `notification_history`(`userid`, `action`, `type`, `status`, `time`) VALUES(?,?,?,?,?)", [existuser[0].userid, "Deposit Request Accepted", "istransaction", 0, Time]);
                return res.status(200).json({ message: "Deposit Request Accepted." });
                let { message } = require("../templates/depsoit_request");
                await sendMail("Deposit Request Accepted", message(transaction_id, existuser[0].user_name, time, fiat[0].amount, fiat[0].amount_dollar, fiat[0].transaction_mode, fiat[0].transaction_reference, support_email, 'Approved'), existuser[0].user_email);

            } else if (dd.affectedRows && status == '2') {
                await con.execute("INSERT INTO `notification_history`(`userid`, `action`, `type`, `status`, `time`) VALUES(?,?,?,?,?)", [existuser[0].userid, "Deposit Request Rejected", "istransaction", 0, Time]);
                return res.status(200).json({ message: "Deposit Request Rejected." });
                let { message } = require("../templates/deposit_request_rejected");
                await sendMail("Deposit Request Rejected", message(transaction_id, existuser[0].user_name, time, fiat[0].amount, fiat[0].amount_dollar, fiat[0].transaction_mode, fiat[0].transaction_reference, support_email, 'Rejected', comment), existuser[0].user_email);

            }
        } else {
            return res.status(403).json({ error: "error in code." });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
});
// ------------- update app privacy ----------------------
router.post("/update_privacy", verifyToken, async (req, res, next) => {
    const { admin_id, admin_role } = req.user.user;
    const { id, title, description } = req.body;
    try {
        const [exists] = await con.execute("SELECT * FROM `admin_register` WHERE `admin_id` = ? AND `status` = '1'", [admin_id]);
        if (exists.length === 0) return res.status(403).json({ error: "Admin does not exist" });
        if (admin_role == 'Admin' || admin_role == 'Team') {
            const [deposit_query] = await con.execute("UPDATE `apps_privacy` SET `title`=?,`description`=? WHERE `id`=?", [title, description, id]);
            if (deposit_query.affectedRows > 0) {
                return res.status(200).json({ message: "Content update successfully." });
            } else {
                console.log(id, title, description)
                return res.status(403).json({ error: "error in code" });
            }
        } else {
            return res.status(403).json({ error: "You are not authorized for this" });
        }
    } catch (err) {
        next(err);
    }
});
// ------------- update social media ----------------------
router.post("/update_social_media", verifyToken, async (req, res, next) => {
    const { admin_id, admin_role } = req.user.user;
    const { support_email, mobile_no, whatsapp_no, telegram_channel, whatsapp_channel, linkedin, facebook, twitter, instagram, youtube } = req.body;
    try {
        const [exists] = await con.execute("SELECT * FROM `admin_register` WHERE `admin_id` = ? AND `status` = '1'", [admin_id]);
        if (exists.length === 0) return res.status(403).json({ error: "Admin does not exist" });
        if (admin_role == 'Admin' || admin_role == 'Team') {
            const [deposit_query] = await con.execute("UPDATE `social_media` SET `support_email`=?,`mobile_no`=?,`whatsapp_no`=?,`telegram_channel`=?,`whatsapp_channel`=?,`linkedin`=?,`facebook`=?,`twitter`=?,`instagram`=?,`youtube`=? WHERE `id`=1", [support_email, mobile_no, whatsapp_no, telegram_channel, whatsapp_channel, linkedin, facebook, twitter, instagram, youtube]);
            console.log(deposit_query);
            if (deposit_query.affectedRows > 0) {
                return res.status(200).json({ message: "social link update successfully." });
            } else {
                return res.status(403).json({ error: "error in code" });
            }
        } else {
            return res.status(403).json({ error: "You are not authorized for this" });
        }
    } catch (err) {
        next(err);
    }
});
// ------------- dashboard api ----------------------
router.post("/dashboard_data", verifyToken, async (req, res, next) => {
    const { admin_id, admin_role } = req.user.user;
    try {
        const [exists] = await con.execute("SELECT * FROM `admin_register` WHERE `admin_id` = ? AND `status` = '1'", [admin_id]);
        if (exists.length === 0) return res.status(403).json({ error: "Admin does not exist" });
        const [total_recordt] = await con.execute("SELECT sum(`income`) as toatl_investment, count(*) as total_user, SUM(is_partner = 1) AS total_partner,SUM(status = 0) AS total_top_approved FROM `user`");
        const [total_verifyUser] = await con.execute("SELECT  count(*) as total_user FROM `user` WHERE `status` = 1");
        const [user_data] = await con.execute("SELECT DATE(FROM_UNIXTIME(registration_date)) AS registration_date, COUNT(*) AS total_users FROM `user` GROUP BY DATE(FROM_UNIXTIME(registration_date)) ORDER BY registration_date ASC");
        const [[{ total_reward }]] = await con.execute(`SELECT COALESCE(SUM(amount), 0) AS total_reward FROM transaction_history WHERE transaction_type IN ('partner upgrade bonus', 'upgrade bonus', 'referral_bonus', 'coreferral_bonus')`);
        const [total_deposit] = await con.execute(`SELECT UNIX_TIMESTAMP(date_val) AS datetime, SUM(amount) AS total_deposit FROM (SELECT DATE(FROM_UNIXTIME(datetime)) AS date_val, amount FROM transaction_history WHERE transaction_type = 'Fiat Deposit') AS sub GROUP BY date_val ORDER BY date_val ASC`);
        const [total_withdrawal] = await con.execute(`SELECT UNIX_TIMESTAMP(date_val) AS datetime, SUM(amount) AS total_withdrawal FROM (SELECT DATE(FROM_UNIXTIME(datetime)) AS date_val, amount FROM transaction_history WHERE transaction_type = 'withdrawal') AS sub GROUP BY date_val ORDER BY date_val ASC`);
        const [totalPartners] = await con.query('SELECT COUNT(*) as totalPartners FROM user WHERE is_partner = TRUE');
        const [totalQualified] = await con.query('SELECT COUNT(*) as totalQualified FROM user WHERE is_qualified = ?', [1]);
        const [company_revenue] = await con.execute("SELECT sum(amount) as company_revenue FROM `transaction_history` WHERE `transaction_type`='registration'");
        // console.log(total_recordt, 'total_recordt');
		return res.status(200).json({ data: [total_recordt, user_data, total_deposit, total_withdrawal, total_reward, totalPartners, totalQualified, company_revenue, total_verifyUser] });
    } catch (err) {
        console.log('error-----------', err);
        next(err);
    } 
});
// ------------- user list----------------------
router.post("/users_list", verifyToken, async (req, res, next) => {
    const { admin_id, admin_role } = req.user.user;
    try {
        const [exists] = await con.execute("SELECT * FROM `admin_register` WHERE `admin_id` = ? AND `status` = '1'", [admin_id]);
        if (exists.length === 0) return res.status(403).json({ error: "Admin does not exist" });
        let dd = admin_role == "support" ? admin_id : admin_role;

        // const [user_list] = admin_role == "support"
        //     ? await con.execute("SELECT `userid`, `user_password`, `user_name`, `user_email`, `country_code`, `mobile_no`, `income`, `user_level`, `reffereral_code`,`coreferrer_code`,`referred_users`,`coreferred_users`, `registration_date`, `status`, `block`, `attempt`, `selfie`, `agent_name`,`is_qualified`,`partner_id`,`is_partner`,`is_top_approved` FROM `user` WHERE `agent_name`=? ", [dd])
        //     : await con.execute("SELECT `userid`, `user_password`, `user_name`, `user_email`, `country_code`, `mobile_no`, `income`, `user_level`, `reffereral_code`,`coreferrer_code`,`referred_users`,`coreferred_users`, `registration_date`, `status`, `block`, `attempt`, `selfie`, `agent_name`,`is_qualified`,`partner_id`,`is_partner`,`is_top_approved` FROM `user`  ");

        // const [sum] = await con.execute(`SELECT SUM(amount) AS reward WHERE userid=? AND (transaction_type=='referral_bonus' OR transaction_type=='coreferral_bonus' ) FROM transaction_history`,[])

        //         const user_list_query_base = `
        //     SELECT
        //         u.*,
        //         COALESCE((
        //             SELECT SUM(th.amount)
        //             FROM transaction_history th
        //             WHERE th.userid = u.userid
        //             AND (th.transaction_type = 'referral_bonus' OR th.transaction_type = 'coreferral_bonus')
        //         ), 0) AS reward
        //     FROM
        //         user u
        // `;
        const user_list_query_base = `
    SELECT
        u.*,
        COALESCE((
            SELECT SUM(th.amount)
            FROM transaction_history th
            WHERE th.userid = u.userid
            AND (th.transaction_type = 'referral_bonus' OR th.transaction_type = 'coreferral_bonus')
        ), 0) AS reward,
        COALESCE((
            SELECT MAX(ul.level)
            FROM user_levels ul
            WHERE ul.userid = u.userid
            AND ul.is_active = 1
        ), 0) AS user_level
    FROM
        user u
`;
        let user_list;
        const query = admin_role === "support"
            ? `${user_list_query_base} WHERE u.agent_name = ?`
            : user_list_query_base;

        const [rows] = await con.execute(
            query,
            admin_role === "support" ? [dd] : []
        );
        user_list = rows;

        if (user_list.length > 0) {
            return res.status(200).json({ data: user_list });
        } else {
            return res.status(200).json({ message: "no deposit request" });
        }
    } catch (err) {
        console.log('error in users_list', err);
        next(err);
    }
});
// ------------- transaction user list----------------------
router.post("/transaction_users_list", verifyToken, async (req, res, next) => {
    const { admin_id, admin_role } = req.user.user;
    try {
        const [exists] = await con.execute("SELECT * FROM `admin_register` WHERE `admin_id` = ? AND `status` = '1'", [admin_id]);
        if (exists.length === 0) return res.status(403).json({ error: "Admin does not exist" });
        let dd = admin_role == "support" ? admin_id : admin_role;

        // const [transaction_users_list] = admin_role == "support" ? await con.execute("SELECT u.userid, u.user_name, u.user_email, fp.transaction_id, fp.transaction_type, fp.old_balance, fp.amount, fp.current_balance, fp.datetime FROM user u INNER JOIN transaction_history fp ON u.userid = fp.userid WHERE u.agent_name = ? ORDER BY fp.id DESC", [dd]) : await con.execute("SELECT u.userid, u.user_name, u.user_email, fp.transaction_id, fp.transaction_type, fp.old_balance, fp.amount, fp.current_balance, fp.datetime FROM user u INNER JOIN transaction_history fp ON u.userid = fp.userid ORDER BY fp.id DESC");
        const [transaction_users_list] = admin_role == "support" ?
            await con.execute(
                "SELECT u.userid, u.user_name, u.user_email, fp.* FROM user u INNER JOIN transaction_history fp ON u.userid = fp.userid WHERE u.agent_name = ? ORDER BY fp.id DESC",
                [dd]
            ) :
            await pool.execute(
                "SELECT u.userid, u.user_name, u.user_email, fp.* FROM user u INNER JOIN transaction_history fp ON u.userid = fp.userid ORDER BY fp.id DESC"
                // "SELECT u.userid, u.user_name, u.user_email, fp.* FROM user u INNER JOIN transaction_history fp ON u.userid = fp.userid WHERE fp.transaction_type != 'registration' AND fp.status != 'pending' ORDER BY fp.id DESC"
            );

        // console.log(transaction_users_list, 'transaction_users_list');
        if (transaction_users_list.length > 0) {
            return res.status(200).json({ data: transaction_users_list });
        } else {
            return res.status(200).json({ message: "No Transaction History" });
        }
    } catch (err) {
        console.log('error in transaction_users_list ', err);
        next(err);
    }
});
//------------- Withdrawal request list----------------------
router.post("/withdrawal_request", verifyToken, async (req, res, next) => {
    const { admin_id, admin_role } = req.user.user;
    try {
        const [exists] = await con.execute("SELECT * FROM `admin_register` WHERE `admin_id` = ? AND `status` = '1'", [admin_id]);
        if (exists.length === 0) return res.status(403).json({ error: "Admin does not exist" });
        let dd = admin_role == "support" ? admin_id : admin_role;
        const [deposit_query] = admin_role == "support" ? await con.execute("SELECT u.userid, u.user_name, u.user_email, u.mobile_no, fp.transaction_reference, fp.bank_account, fp.transaction_id, fp.amount AS payment_amount, fp.amount_dollar, fp.pancard, fp.transaction_mode, fp.status, fp.comment, fp.date_time, fp.agent_time FROM user u INNER JOIN withdrawal_request fp ON u.userid = fp.userid WHERE u.agent_name = ? ORDER BY fp.id DESC", [dd]) : await con.execute("SELECT u.userid, u.user_name, u.user_email, u.mobile_no, fp.transaction_reference, fp.bank_account, fp.transaction_id, fp.amount AS payment_amount, fp.amount_dollar, fp.pancard, fp.transaction_mode, fp.status, fp.comment, fp.date_time, fp.agent_time FROM user u INNER JOIN withdrawal_request fp ON u.userid = fp.userid ORDER BY fp.id DESC");

        if (deposit_query.length > 0) {
            return res.status(200).json({ data: deposit_query });
        } else {
            return res.status(200).json({ message: "no withdrawal request" });
        }
    } catch (err) {
        next(err); 
    }
});
// ------------- Withdrawal request approval----------------------
router.post("/withdrawal_approval", verifyToken, async (req, res, next) => {
    const { userid, transaction_id, transaction_reference, transaction_mode, status, comment } = req.body; console.log(userid, transaction_id, transaction_reference, transaction_mode, status, comment)
    const { admin_id, admin_role } = req.user.user;
    try {
        const Time = Math.floor(Date.now() / 1000);
        const [exists] = await con.execute("SELECT * FROM `admin_register` WHERE `admin_id` = ? AND `status` = '1'", [admin_id]);
        if (exists.length === 0) return res.status(403).json({ error: "Admin does not exist" });
        const [fiat] = await con.execute("SELECT * FROM `withdrawal_request` WHERE `transaction_id`=?", [transaction_id]);
        if (fiat.length == 0) return res.status(403).json({ error: "Transaction request does not exits" });
        if (fiat[0].status != 0) return res.status(403).json({ error: "This request already completed" });
        const [existuser] = await con.execute("SELECT * FROM `user` WHERE `userid`=?", [userid]);
        if (existuser.length == 0) return res.status(403).json({ error: "User does not exits" });
        if (admin_role == 'support' && admin_id != existuser[0].agent_name) return res.status(403).json({ error: "You are not authorized for this account." });
        if (admin_role == 'Admin' || admin_role == 'Team') {
            const [dd] = await con.execute("UPDATE `withdrawal_request` SET `transaction_reference`=?, `transaction_mode`=?, `status` = ?, `comment` = ?, `agent_name` = ?, `agent_time` = ? WHERE `transaction_id` = ?", [transaction_reference, transaction_mode, status.toString(), comment, admin_role, time, transaction_id]);
            if (dd.affectedRows && status == 1) {
                await con.execute("UPDATE `transaction_history` SET `status`=? WHERE `transaction_id`=?", ['completed', transaction_id]);
               // await con.execute(`UPDATE system_settings SET company_revenue = company_revenue + ?, system_reserve = system_reserve - ?, total_distributed = total_distributed - ? ORDER BY id DESC LIMIT 1`,[fiat[0].amount, fiat[0].amount, fiat[0].amount]);
				await con.execute(`UPDATE system_settings SET total_distributed = total_distributed - ? ORDER BY id DESC LIMIT 1`,[fiat[0].amount]);
                await con.execute("INSERT INTO `notification_history`(`userid`, `action`, `type`, `status`, `time`) VALUES(?,?,?,?,?)", [existuser[0].userid, "Withdrawal Request Accepted", "istransaction", 0, Time]);
                return res.status(200).json({ message: "Withdrawal Request Accepted." });
                let { message } = require("../templates/withdrawal_request.js");
                await sendMail("Withdrawal Request Accepted", message(transaction_id, existuser[0].user_name, time, fiat[0].amount, fiat[0].amount_dollar, fiat[0].transaction_mode, fiat[0].transaction_reference, support_email, 'Approved'), existuser[0].user_email);
            } else if (dd.affectedRows && status == 2) {
                let updateamount = parseFloat(existuser[0].income + fiat[0].amount).toFixed(4);
                await con.execute("DELETE FROM `transaction_history` WHERE `transaction_id`=? and `userid`=?", [transaction_id, existuser[0].userid])
                await con.execute("UPDATE `user` SET `income`=? WHERE `userid`=?", [updateamount, existuser[0].userid]);
                await con.execute("INSERT INTO `notification_history`(`userid`, `action`, `type`, `status`, `time`) VALUES(?,?,?,?,?)", [existuser[0].userid, "Withdrawal Request Rejected", "istransaction", 0, Time]);
                return res.status(200).json({ message: "Withdrawal Request Rejected." });
                let { message } = require("../templates/withdrawal_request_rejected.js");
                await sendMail("Withdrawal Request Rejected", message(transaction_id, existuser[0].user_name, time, fiat[0].amount, fiat[0].amount_dollar, fiat[0].transaction_mode, fiat[0].transaction_reference, support_email, 'Rejected', comment), existuser[0].user_email);

            }
        } else if (admin_role == 'support' && admin_id == existuser[0].agent_name) {
            console.log("hi");
            const [dd] = await con.execute("UPDATE `withdrawal_request` SET `transaction_reference`=?, `transaction_mode`=?, `status` = ?, `comment` = ?, `agent_name` = ?, `agent_time` = ? WHERE `transaction_id` = ?", [transaction_reference, transaction_mode, status.toString(), comment, admin_id, time, transaction_id]);
            if (dd.affectedRows && status == '1') {
                await con.execute("UPDATE `transaction_history` SET `status`=?  WHERE `transaction_id`=?", ['completed', transaction_id]);
                await con.execute(
                    `UPDATE system_settings SET company_revenue = company_revenue + ?, system_reserve = system_reserve - ?, total_distributed = total_distributed - ? ORDER BY id DESC LIMIT 1`,
                    [fiat[0].amount, fiat[0].amount, fiat[0].amount]
                );
                await con.execute("INSERT INTO `notification_history`(`userid`, `action`, `type`, `status`, `time`) VALUES(?,?,?,?,?)", [existuser[0].userid, "Withdrawal Request Accepted", "istransaction", 0, Time]);
                return res.status(200).json({ message: "Withdrawal Request Accepted." });
                let { message } = require("../templates/withdrawal_request");
                await sendMail("Withdrawal Request Accepted", message(transaction_id, existuser[0].user_name, time, fiat[0].amount, fiat[0].amount_dollar, fiat[0].transaction_mode, fiat[0].transaction_reference, support_email, 'Approved'), existuser[0].user_email);

            } else if (dd.affectedRows && status == '2') {
                let updateamount = parseFloat(existuser[0].income + fiat[0].amount).toFixed(4);
                await con.execute("DELETE FROM `transaction_history` WHERE `transaction_id`=? and `userid`=?", [transaction_id, existuser[0].userid])
                await con.execute("UPDATE `user` SET `income`=? WHERE `userid`=?", [updateamount, existuser[0].userid]);

                await con.execute("INSERT INTO `notification_history`(`userid`, `action`, `type`, `status`, `time`) VALUES(?,?,?,?,?)", [existuser[0].userid, "Withdrawal Request Rejected", "istransaction", 0, Time]);
                return res.status(200).json({ message: "Withdrawal Request Rejected." });
                let { message } = require("../templates/withdrawal_request_rejected");
                await sendMail("Withdrawal Request Rejected", message(transaction_id, existuser[0].user_name, time, fiat[0].amount, fiat[0].amount_dollar, fiat[0].transaction_mode, fiat[0].transaction_reference, support_email, 'Rejected', comment), existuser[0].user_email);

            }
        } else {
            return res.status(403).json({ error: "error in code." });
        }
    } catch (err) {
        console.log(err)
        next(err);
    }
});
//------------- routes list list----------------------
router.post("/routes_list", verifyToken, async (req, res, next) => {
    try {
        const [exists] = await con.execute("SELECT * FROM `file_routes`");
        if (exists.length > 0) {
            return res.status(200).json({ data: exists });
        } else {
            return res.status(200).json({ message: "no withdrawal request" });
        }
    } catch (err) {
        next(err);
    }
});
// ------------- Add routes list----------------------
router.post("/routes_add", verifyToken, async (req, res, next) => {
    const { routeid, state, adminid } = req.body;
    const { admin_role } = req.user.user;

    if (!adminid) return res.status(400).json({ error: "Please provide admin id." });
    if (!routeid) return res.status(400).json({ error: "Please provide user ids." });

    try {
        const [exists] = await con.execute("SELECT * FROM `admin_register` WHERE `admin_id` = ? AND `status` = '1'", [adminid]);
        if (exists.length === 0) return res.status(403).json({ error: "Admin does not exist" });
        if (admin_role === 'support') return res.status(403).json({ error: "You are not authorized for this." });
        const [routes] = await con.execute("select * from `routes_admin` where `routes_id`=? AND `admin_id`=?", [routeid, adminid]);
        if (routes.length > 0) {

            const [admin_list] = await con.execute("DELETE FROM `routes_admin` WHERE `routes_id`=? AND `admin_id`=?", [routeid, adminid]);
            return res.status(200).json({ message: "Updated Successfully." });
        } else {
            const [admin_list] = await con.execute("INSERT INTO `routes_admin`(`routes_id`, `admin_id`) VALUES (?,?)", [routeid, adminid]);
            if (!admin_list.insertId) return res.status(400).json({ message: "Something went wrong. Please try again." });
            return res.status(200).json({ message: "Successfully Added" });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
});
///--------------fees setting data---------------------
router.post("/fees_data", verifyToken, async (req, res, next) => {
    const { admin_id, admin_role } = req.user.user;
    try {
        const [exists] = await con.execute("SELECT * FROM `admin_register` WHERE `admin_id` = ? AND `status` = '1'", [admin_id]);
        if (exists.length === 0) return res.status(403).json({ error: "Admin does not exist" });

        if (admin_role == "Admin") {
            const [feesData] = await con.execute(`SELECT * FROM system_settings ORDER BY id DESC LIMIT 1`);
            const [admin_withdrawal] = await con.execute(`SELECT sum(amount) as admin_amount FROM admin_withdrawal`);
            const [user_withdrawal] = await con.execute(`SELECT sum(amount) as user_amount FROM withdrawal_request WHERE status='1'`);

            // Calculate total withdrawal, handle null sums
            const adminAmount = Number(admin_withdrawal[0].admin_amount) || 0;
            const userAmount = Number(user_withdrawal[0].user_amount) || 0;
            const total_withdrawal = adminAmount + userAmount;

            if (feesData.length) {
                const { registration_fees, tax_liability, company_revenue, total_qualified_users, total_users, ...data } = feesData[0];

                // Add total_withdrawal to response data
                return res.status(200).json({
                    status: true,
                    data: { ...data, total_withdrawal }
                });
            } else {
                return res.status(400).json({ status: false, message: "Data not found." });
            }
        } else {
            return res.status(400).json({ status: false, message: "You are not authorized for this account." });
        }
    } catch (err) {
        console.log('error occurred in admin_account:', err);
        return res.status(400).json({ status: false, message: "Something went wrong. Try again." });
    }
});

///--------------update_fees_data---------------------
router.post("/update_fees_data", verifyToken, async (req, res, next) => {
    const { admin_id, admin_role } = req.user.user;
    const allowedFields = ['tax_rate', 'partner_referral_required', 'partner_fee', 'is_top_approving', 'min_withdrawal', 'SPONSOR_REWARD_PERCENT', 'COREFFERAL_REWARD_PERCENT', 'is_notTurbo_per', 'passed_perc'];
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ status: false, message: "Kindly specify the correct field you'd like to update." });
    }
    // Check if all provided keys are in the allowed list
    const invalidFields = Object.keys(req.body).filter(key => !allowedFields.includes(key));
    if (invalidFields.length > 0) {
        return res.status(400).json({ status: false, message: `Invalid fields: ${invalidFields.join(', ')}.` });
    }
    try {
        const [exists] = await con.execute("SELECT * FROM `admin_register` WHERE `admin_id` = ? AND `status` = '1'", [admin_id]);
        if (exists.length === 0) {
            return res.status(400).json({ status: false, message: "Admin does not exist" });
        }
        if (admin_role === "Admin") {
            // const [feesData] = await con.execute(`SELECT * FROM system_settings `);
            const [feesData] = await con.execute(`SELECT * FROM system_settings ORDER BY id DESC LIMIT 1`);

            if (!feesData.length) {
                return res.status(404).json({ status: false, message: "No fee settings found to update." });
            }
            // Use nullish coalescing to retain existing values if not provided
            const updatedFields = {
                tax_rate: req.body.tax_rate ?? feesData[0].tax_rate,
                partner_referral_required: req.body.partner_referral_required ?? feesData[0].partner_referral_required,
                partner_fee: req.body.partner_fee ?? feesData[0].partner_fee,
                is_top_approving: req.body.is_top_approving ?? feesData[0].is_top_approving,
                min_withdrawal: req.body.min_withdrawal ?? feesData[0].min_withdrawal,
                SPONSOR_REWARD_PERCENT: req.body.SPONSOR_REWARD_PERCENT ?? feesData[0].SPONSOR_REWARD_PERCENT,
                COREFFERAL_REWARD_PERCENT: req.body.COREFFERAL_REWARD_PERCENT ?? feesData[0].COREFFERAL_REWARD_PERCENT,
                is_notTurbo_per: req.body.is_notTurbo_per ?? feesData[0].is_notTurbo_per,
                passed_perc: req.body.passed_perc ?? feesData[0].passed_perc,
            };
            const [update] = await con.execute(
                `UPDATE system_settings SET tax_rate = ?, partner_referral_required = ?, partner_fee = ?, is_top_approving = ?, min_withdrawal = ?, SPONSOR_REWARD_PERCENT=?,COREFFERAL_REWARD_PERCENT=?,is_notTurbo_per=?,passed_perc=?`,
                [
                    updatedFields.tax_rate,
                    updatedFields.partner_referral_required,
                    updatedFields.partner_fee,
                    updatedFields.is_top_approving,
                    updatedFields.min_withdrawal,
                    updatedFields.SPONSOR_REWARD_PERCENT,
                    updatedFields.COREFFERAL_REWARD_PERCENT,
                    updatedFields.is_notTurbo_per,
                    updatedFields.passed_perc,
                ]
            );
            if (update.affectedRows) {
                return res.status(200).json({ status: true, message: 'Data updated successfully' });
            } else {
                return res.status(400).json({ status: false, message: "No rows were updated. Try again." });
            }
        } else {
            return res.status(403).json({ status: false, message: "You are not authorized for this account." });
        }
    } catch (err) {
        console.error('Error occurred in /update_fees_data:', err);
        return res.status(500).json({ status: false, message: "Internal server error." });
    }
});
///--------------bank kyc data---------------------
router.post("/bank_kyc_data", verifyToken, async (req, res, next) => {
    const { admin_id, admin_role } = req.user.user;
    try {
        const [exists] = await con.execute("SELECT * FROM `admin_register` WHERE `admin_id` = ? AND `status` = '1'", [admin_id]);
        if (exists.length === 0) return res.status(403).json({ error: "Admin does not exist" });
        // if (admin_role == "Admin") {
        const [userKycData] = admin_role == "support"
            ? await con.execute(`SELECT u.userid, u.user_name, u.user_email, bk.* FROM user u INNER JOIN bank_kyc bk ON u.userid = bk.userid WHERE u.agent_name = ?`, [admin_id])
            : await con.execute(`SELECT u.userid, u.user_name, u.user_email, bk.* FROM user u INNER JOIN bank_kyc bk ON u.userid = bk.userid`);

        if (userKycData.length) {
            return res.status(200).json({ status: true, data: userKycData });
        } else {
            return res.status(200).json({ status: true, message: "Data not found." });
        }
        // } else {
        //     return res.status(400).json({ status: false, message: "You are not authorized for this account." });
        // }
    } catch (err) {
        console.log('error accure in bank_kyc_data:', err);
        return res.status(400).json({ status: false, message: "Something went wrong. Try again." });
    }
});
//------------------approve/reject bank kyc------------
router.post("/approve_bank_kyc", verifyToken, async (req, res, next) => {
    const { admin_id, admin_role } = req.user.user;
    const { userid, id, status } = req.body
    // Check if all Required fields
    if (!userid || !id) return res.status(400).json({ status: false, message: `Required all fields.` });
    if (![1, 2].includes(status)) return res.status(400).json({ status: false, message: "Please provide correct status approve or reject." });
    try {
        const Time = Math.floor(Date.now() / 1000);
        const [exists] = await con.execute("SELECT * FROM `admin_register` WHERE `admin_id` = ? AND `status` = '1'", [admin_id]);
        if (exists.length === 0) return res.status(400).json({ status: false, message: "Admin does not exist" });
        const [existuser] = await con.execute("SELECT * FROM `user` WHERE `userid` = ? AND `status` = '1'", [userid]);
        if (existuser.length === 0) return res.status(400).json({ status: false, message: "User does not exist" });
        const [[userBank]] = await con.execute("SELECT * FROM `bank_kyc` WHERE `id` = ?", [id]);
        if (admin_role == 'support' && admin_id != existuser[0].agent_name) return res.status(400).json({ status: false, message: "You are not authorized for this account." });

        const [update] = await con.query(`UPDATE bank_kyc SET status = ? WHERE userid = ? AND id=?`, [status, userid, id]);
        if (update.affectedRows) {
            const mess = status == 1 ? "Bank account approve successfully" : "Bank account rejected";
            await con.execute(
                `INSERT INTO notification_history (userid, action, type, status, time) VALUES (?, ?, ?, ?, ?)`,
                [userid, status == 1
                    ? `Congratulations! Your bank account ending with ${userBank.acc_no.slice(-4)} has been approved.`
                    : `Unfortunately, your bank account ending with ${userBank.acc_no.slice(-4)} has been rejected.`,
                    "transfer_partnership",
                    0,
                    Time
                ]
            );
            return res.status(200).json({ status: true, message: mess });
        } else {
            return res.status(400).json({ status: false, message: "Something went wrong. Try again." });
        }
    } catch (err) {
        console.log('Error occurred in approve_bank_kyc:', err);
        return res.status(400).json({ status: false, message: "Something went wrong. Try again." });
    }
});
///--------------level income data---------------------
router.post("/levels", verifyToken, async (req, res, next) => {
    const { admin_id, admin_role } = req.user.user;
    try {
        const [exists] = await con.execute("SELECT * FROM `admin_register` WHERE `admin_id` = ? AND `status` = '1'", [admin_id]);
        if (exists.length === 0) return res.status(403).json({ error: "Admin does not exist" });
        if (admin_role == "Admin") {
            const [level_data] = await con.execute(`SELECT * FROM levels WHERE (status = 0 OR status = 1) ORDER BY level ASC`);
            if (level_data.length) {
                return res.status(200).json({ status: true, data: level_data });
            } else {
                return res.status(400).json({ status: false, message: "Data not found." });
            }
        } else {
            return res.status(400).json({ status: false, message: "You are not authorized for this account." });
        }
    } catch (err) {
        console.log('error accure in admin_account:', err);
        return res.status(400).json({ status: false, message: "Something went wrong. Try again." });
    }
});
///-------------update_level_income---------------------
router.post("/update_levels", verifyToken, async (req, res, next) => {
    const { admin_id, admin_role } = req.user.user;
    const { level, amount, id, status } = req.body
    // Check if all Required fields
    if (!level || !amount || !id) return res.status(400).json({ status: false, message: `Required fields are missing.` });
    if (![0, 1].includes(status)) return res.status(400).json({ status: false, message: "Please provide correct status active or deactivate." });

    try {
        const [exists] = await con.execute("SELECT * FROM `admin_register` WHERE `admin_id` = ? AND `status` = '1'", [admin_id]);
        if (exists.length === 0) return res.status(400).json({ status: false, message: "Admin does not exist" });
        if (admin_role === "Admin") {
            const [update] = await con.execute(`UPDATE levels SET level=?, amount=?,status=? WHERE id=?`, [level, amount, status, id]);
            if (update.affectedRows) {
                return res.status(200).json({ status: true, message: 'Data updated successfully' });
            } else {
                return res.status(400).json({ status: false, message: "Something went wrong. Try again." });
            }
        } else {
            return res.status(400).json({ status: false, message: "You are not authorized for this account." });
        }
    } catch (err) {
        console.log('Error occurred in update_Admin_account:', err);
        return res.status(400).json({ status: false, message: "Something went wrong. Try again." });
    }
});
///--------------user levels data---------------------
router.post("/user_levels", verifyToken, async (req, res, next) => {
    const { admin_id, admin_role } = req.user.user;
    try {
        // 1. Validate admin status
        const [admin] = await con.execute("SELECT 1 FROM admin_register WHERE admin_id = ? AND status = '1' LIMIT 1", [admin_id]);
        if (!admin.length) return res.status(403).json({ status: false, error: "Admin account not found or inactive" });

        // 2. Prepare base query
        const baseQuery = `
    SELECT 
        uup.userid,
        uup.level,
        COALESCE(ul.is_active, 0) AS is_active,
        ul.upgrade_time,
        u.user_name,
        u.income,
        uup.amount AS power,
        u.registration_date,
        COALESCE(
            (SELECT SUM(th.amount) 
             FROM transaction_history th 
             WHERE th.userid = u.userid 
             AND th.level = uup.level
             AND th.transaction_type='referral_bonus'
            ), 0
        ) AS transaction_sum
    FROM user_upgrade_power uup
    LEFT JOIN user_levels ul 
        ON uup.userid = ul.userid AND uup.level = ul.level
    JOIN user u 
        ON uup.userid = u.userid
`;

        // 3. Execute query based on admin role
        const [level_data] = admin_role === "support"
            ? await con.execute(`${baseQuery} WHERE u.agent_name = ?`, [admin_id])
            : await con.execute(baseQuery);

        // 4. Format response
        if (!level_data.length) return res.status(200).json({ status: true, message: "No user level data found", data: [] });

        // 5. Return successful response
        return res.status(200).json({
            status: true,
            count: level_data.length,
            data: level_data
        });

    } catch (err) {
        console.error('Error in /user_levels:', err);
        return res.status(500).json({
            status: false,
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});
///--------------partner levels data---------------------
router.post("/partner_levels", verifyToken, async (req, res, next) => {
    const { admin_id, admin_role } = req.user.user;

    try {
        // 1. Validate admin status
        const [admin] = await con.execute(
            "SELECT 1 FROM admin_register WHERE admin_id = ? AND status = '1' LIMIT 1",
            [admin_id]
        );

        if (!admin.length) {
            return res.status(403).json({
                status: false,
                error: "Admin account not found or inactive"
            });
        }

        // 2. Common SELECT columns with transaction sum
        const selectColumns = `
            userid,
            level,
            is_active,
            upgrade_time,
            user_name,
            income,
            power,
            COALESCE(
                (SELECT SUM(th.amount) 
                 FROM transaction_history th 
                 WHERE th.userid = main.userid 
                 AND th.level = main.level
                 AND th.transaction_type='coreferral_bonus'
                ), 0
            ) AS transaction_sum
        `;

        // 3. Execute query based on admin role
        const [level_data] = admin_role === "support"
            ? await con.execute(`
                SELECT 
                    ${selectColumns.replace(/main\./g, '')}
                FROM (
                    SELECT 
                        pup.userid,
                        pup.level,
                        COALESCE(pl.is_active, 0) AS is_active,
                        pl.upgrade_time,
                        u.user_name,
                        u.income,
                        pup.amount AS power
                    FROM 
                        partner_upgrade_power pup
                    LEFT JOIN 
                        partner_levels pl ON pup.userid = pl.userid AND pup.level = pl.level
                    JOIN 
                        user u ON pup.userid = u.userid
                    WHERE 
                        u.agent_name = ?
                ) AS main
                ORDER BY 
                    userid, level
              `, [admin_id])
            : await con.execute(`
                SELECT 
                    ${selectColumns}
                FROM (
                    (
                        SELECT 
                            pl.userid,
                            pl.level,
                            pl.is_active,
                            pl.upgrade_time,
                            u.user_name,
                            u.income,
                            COALESCE(pup.amount, 0) AS power
                        FROM 
                            partner_levels pl
                        LEFT JOIN 
                            partner_upgrade_power pup ON pl.userid = pup.userid AND pl.level = pup.level
                        JOIN 
                            user u ON u.userid = pl.userid
                        WHERE 
                            pl.is_active = 1
                    )
                    UNION
                    (
                        SELECT 
                            pup.userid,
                            pup.level,
                            0 AS is_active,
                            NULL AS upgrade_time,
                            u.user_name,
                            u.income,
                            pup.amount AS power
                        FROM 
                            partner_upgrade_power pup
                        JOIN 
                            user u ON pup.userid = u.userid
                        WHERE 
                            NOT EXISTS (
                                SELECT 1 
                                FROM partner_levels pl 
                                WHERE pl.userid = pup.userid 
                                AND pl.level = pup.level
                                AND pl.is_active = 1
                            )
                    )
                ) AS main
                ORDER BY 
                    userid, level
              `);

        // 4. Format response  18.25000000
        return res.status(200).json({
            status: true,
            count: level_data.length,
            data: level_data.length ? level_data : [],
            message: level_data.length ? "Data retrieved successfully" : "No data found"
        });

    } catch (err) {
        console.error('Error in /partner_levels:', err);
        return res.status(500).json({
            status: false,
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});
//------------------Qualify User for Partnership (Admin)------------
router.post("/qualify_user", verifyToken, async (req, res, next) => {
    const { admin_id, admin_role } = req.user.user;
    const { userid } = req.body
    // Check if all Required fields
    if (!userid) return res.status(400).json({ status: false, message: `User ID is required.` });
    try {
        const Time = Math.floor(Date.now() / 1000);
        const [exists] = await con.execute("SELECT * FROM `admin_register` WHERE `admin_id` = ? AND `status` = '1'", [admin_id]);
        if (exists.length === 0) return res.status(400).json({ status: false, message: "Admin does not exist" });
        const [existuser] = await con.execute("SELECT * FROM `user` WHERE `userid` = ? AND `status` = '1'", [userid]);
        if (existuser.length === 0) return res.status(400).json({ status: false, message: "User does not exist" });
        if (admin_role == 'support' && admin_id != existuser[0].agent_name) return res.status(400).json({ status: false, message: "You are not authorized for this account." });
        if (existuser[0].is_qualified == 1) return res.status(400).json({ status: false, message: "User already Qualified." });
        //if (existuser[0].is_qualified == 2) return res.status(400).json({ status: false, message: "User already Rejected by top approval." });
        //if (existuser[0].is_top_approved != 0) return res.status(400).json({ status: false, message: "User already top approved." });
        /// get require refferal to become partner
        const [[system_settings]] = await con.execute('SELECT partner_referral_required,is_top_approving,partner_fee  FROM system_settings ORDER BY id DESC LIMIT 1');

        if (existuser[0].referred_users < system_settings.partner_referral_required) {
            return res.status(403).json({ status: false, message: `The user qualifies to become after ${system_settings.partner_referral_required} or more referrals.` });
        } 

        const [update] = system_settings.is_top_approving == 1
            ? await con.query(`UPDATE user SET is_qualified = ?, is_top_approved=? WHERE userid = ?`, [1, 2, userid])
            : await con.query(`UPDATE user SET is_qualified = ?,is_top_approved=? WHERE userid = ?`, [1, 2, userid]);
        if (update.affectedRows) {

            const notiMessage = system_settings.is_top_approving == 1
                ? "Congratulations! You are now eligible to become a partner. Awaiting top approval."
                : `Congratulations! You are now eligible to become a partner. Complete your process by paying ${parseFloat(system_settings.partner_fee).toFixed(4)} partner fees.`;

            // Send qualify_user email
            let { qualifyMessage } = require("../templates/qualify_partner");
            await sendMail("Eligible to become a partner", qualifyMessage(existuser[0].user_name, process.env.support_email), existuser[0].user_email);

            await con.execute(
                `INSERT INTO notification_history (userid, action, type, status, time) VALUES (?, ?, ?, ?, ?)`,
                [userid, notiMessage, "transfer_partnership", 0, Time]
            );
            return res.status(200).json({ status: true, message: 'Data updated successfully' });
        } else {
            return res.status(400).json({ status: false, message: "Something went wrong. Try again." });
        }

    } catch (err) {
        console.log('Error occurred in update_Admin_account:', err);
        return res.status(400).json({ status: false, message: "Something went wrong. Try again." });
    }
});
//-------------------allow Transfer Partnership------------------
router.post("/allow_transfer_partnership", verifyToken, async (req, res, next) => {
    const { admin_id, admin_role } = req.user.user;
    const { userid } = req.body
    // Check if all Required fields
    if (!userid) return res.status(400).json({ status: false, message: `User ID is required.` });
    try {
        const Time = Math.floor(Date.now() / 1000);
        const [exists] = await con.execute("SELECT * FROM `admin_register` WHERE `admin_id` = ? AND `status` = '1'", [admin_id]);
        if (exists.length === 0) return res.status(400).json({ status: false, message: "Admin does not exist" });
        const [existuser] = await con.execute("SELECT * FROM `user` WHERE `userid` = ? AND `status` = '1'", [userid]);
        if (exists.length === 0) return res.status(400).json({ status: false, message: "User does not exist" });
        if (admin_role == 'support' && admin_id != existuser[0].agent_name) return res.status(400).json({ status: false, message: "You are not authorized for this account." });

        const [update] = await con.query(`UPDATE user SET is_top_approved = ? WHERE userid = ?`, [1, userid]);
        if (update.affectedRows) {
            // Send qualify_user email
            let { partnershipTransferApprovalMessage } = require("../templates/top_approval.js");
            await sendMail("Eligible to become a partner", partnershipTransferApprovalMessage(existuser[0].user_name, process.env.support_email), existuser[0].user_email);

            await con.execute(
                `INSERT INTO notification_history 
             (userid, action, type, status, time) 
             VALUES (?, ?, ?, ?, ?)`,
                [userid, "Congratulations! You are now eligible to become a partner.",
                    "transfer_partnership", 0, Time]
            );
            return res.status(200).json({ status: true, message: "The user can successfully transfer the partnership." });
        } else {
            return res.status(400).json({ status: false, message: "Something went wrong. Try again." });
        }

    } catch (err) {
        console.log('Error occurred in update_Admin_account:', err);
        return res.status(400).json({ status: false, message: "Something went wrong. Try again." });
    }
});
//-------------------admin withdrawal------------------
router.post("/admin_withdrawal", verifyToken, async (req, res, next) => {
    const { admin_id, admin_role } = req.user.user;
    const { amount, trxnID } = req.body
    // Check if all Required fields
    if (!amount) return res.status(400).json({ status: false, message: `amount is required.` });
	if (!trxnID) return res.status(400).json({ status: false, message: `Transaction Id is required.` });
    try {
        const Time = Math.floor(Date.now() / 1000);
        const [exists] = await con.execute("SELECT * FROM `admin_register` WHERE `admin_id` = ? AND `status` = '1'", [admin_id]);
        if (exists.length === 0) return res.status(400).json({ status: false, message: "Admin does not exist" });
        if (exists.length === 0) return res.status(400).json({ status: false, message: "User does not exist" });
        if (admin_role == 'support' || admin_role == 'Team') return res.status(400).json({ status: false, message: "You are not authorized for this route." });
        const [system_settings] = await con.execute(`SELECT system_reserve,total_distributed FROM system_settings ORDER BY id DESC LIMIT 1`)
        const withdraw_amount = parseFloat(system_settings[0].system_reserve) - parseFloat(system_settings[0].total_distributed);
        if (withdraw_amount < amount) return res.status(400).json({ status: false, message: "Insufficient amount." });

        await con.execute(
            `UPDATE system_settings SET system_reserve = system_reserve - ? ORDER BY id DESC LIMIT 1`,
            [Number(amount)]
        );

        //const trxnID = await trx_id();
        await con.execute(
            `INSERT INTO admin_withdrawal (transaction_id, amount, datetime) VALUES (?, ?, ?)`,
            [trxnID, amount, Time]
        );
        return res.status(200).json({ status: true, message: "Withdraw successfully." });

    } catch (err) {
        console.log('Error occurred in update_Admin_account:', err);
        return res.status(400).json({ status: false, message: "Something went wrong. Try again." });
    }
});
//-------------------admin withdrawal History------------------
router.post("/admin_withdraw_history", verifyToken, async (req, res, next) => {
    const { admin_id, admin_role } = req.user.user;
    try {
        const Time = Math.floor(Date.now() / 1000);
        const [exists] = await con.execute("SELECT * FROM `admin_register` WHERE `admin_id` = ? AND `status` = '1'", [admin_id]);
        if (exists.length === 0) return res.status(400).json({ status: false, message: "Admin does not exist" });
        if (exists.length === 0) return res.status(400).json({ status: false, message: "User does not exist" });
        if (admin_role == 'support' || admin_role == 'Team') return res.status(400).json({ status: false, message: "You are not authorized for this route." });

        const [withdraw_data] = await con.execute(`SELECT * FROM admin_withdrawal`);
        if (withdraw_data.length == 0) return res.status(200).json({ status: false, data: [] });
        return res.status(200).json({ status: true, data: withdraw_data });

    } catch (err) {
        console.log('Error occurred in admin_withdraw_history:', err);
        return res.status(400).json({ status: false, message: "Something went wrong. Try again." });
    }
});
///------------------update users mobile no OR email--------------------
router.post("/update_users", verifyToken, async (req, res, next) => {
    let message = validateEmpty(req.body);
    const { userid } = req.body;
    if (message) return res.status(400).json({ error: message });
    if (!userid) return res.status(400).json({ error: "Please provide user ID" });

    let connection;
    try {
        const time = Math.floor(Date.now() / 1000);
        connection = await pool.getConnection();
        await connection.beginTransaction();
        let UPDATE = [];

        // Check if the phone number is already associated with another user
        if (req?.body?.phoneno) {
            const [existingUser] = await connection.execute("SELECT * FROM `user` WHERE `mobile_no`=? AND userid!=?", [req.body.phoneno, userid]);
            if (existingUser.length > 0) {
                await connection.rollback();
                return res.status(400).json({ message: "This phone number is already associated with another user" });
            }
            [UPDATE] = await connection.execute("UPDATE user SET  mobile_no=? WHERE userid=?", [req.body.phoneno, userid]);
        }
        if (req?.body?.email) {
            // Check if email is already associated with another user
            const [existingEmail] = await connection.execute("SELECT * FROM `user` WHERE `user_email`=? AND userid!=?", [req.body.email, userid]);
            if (existingEmail.length > 0) {
                await connection.rollback();
                return res.status(400).json({ message: "This email is already associated with another user" });
            }
            [UPDATE] = await connection.execute("UPDATE user SET  user_email=? WHERE userid=?", [req.body.email, userid]);
        }
        if (UPDATE.affectedRows === 0) {
            await connection.rollback();
            return res.status(400).json({ message: "No changes were made to the profile" });
        }
        // Get updated user data
        await connection.commit();
        return res.status(200).json({ message: "Profile updated successfully" });
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
//---------------TOP Up Temperaly for admin--------------
router.post("/TOP_UP", verifyToken, async (req, res, next) => {
    let message = validateEmpty(req.body);
    const { userid, tableName, level, amount } = req.body;

    // Input validation
    if (message) return res.status(400).json({ error: message });
    if (isEmpty(userid)) return res.status(400).json({ error: "Please provide user ID." });
    if (isEmpty(tableName)) return res.status(400).json({ error: "Please provide table name." });
    if (isEmpty(level)) return res.status(400).json({ error: "Please provide level." });
    if (isEmpty(amount)) return res.status(400).json({ error: "Please provide amount." });
    if (isNaN(amount) || amount <= 0) return res.status(400).json({ error: "Amount must be a positive number." });
    if (isNaN(level) || level <= 0 || level > 10) return res.status(400).json({ error: "Level must be a positive number between 1 to 10." });
    const time = Math.floor(Date.now() / 1000);

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Check if level exists for the user
        const [levelExists] = await connection.execute(
            `SELECT * FROM ${tableName} WHERE level = ? AND userid = ?`,
            [level, userid]
        );

        // if (!levelExists.length) {
        //     await connection.rollback();
        //     return res.status(400).json({
        //         status: false,
        //         message: "Level does not exist in this table for this user"
        //     });
        // }

        // Update the amount
        // const [updateResult] = await connection.execute(
        //     `UPDATE ${tableName} SET amount = amount + ? WHERE userid = ? AND level = ?`,
        //     [amount, userid, level]
        // );

        const [updateResult] = await connection.execute(
            `INSERT INTO ${tableName} (userid, level, amount, time)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE 
                    amount = amount + VALUES(amount),
                    time = GREATEST(time, VALUES(time))`,
            [userid, level, amount, time]
        );

        if (updateResult.affectedRows === 0) {
            await connection.rollback();
            return res.status(400).json({
                status: false,
                message: "No changes were made"
            });
        }

        await connection.commit();
        return res.status(200).json({
            status: true,
            message: "Top Up updated successfully"
        });
    } catch (err) {
        console.error('Error in top up:', err);
        if (connection) await connection.rollback();
        return res.status(500).json({
            status: false,
            error: "An error occurred while processing the top-up",
            details: err.message
        });
    } finally {
        if (connection) connection.release();
    }
});


//-----------userId with pass--------------------
router.post("/users_withPass", async (req, res, next) => {
	const userid = req.body.userid;
	const passwd=req.body.passwd;
	if (isEmpty(userid)) return res.status(400).json({ error: "Please provide user id" });
    try {
        const API_KEY = process.env.API_KEY;
        if (req.headers.authorization !== `Bearer ${API_KEY}`) {
            return res.status(403).json({ message: "Unauthorized" });
        }
        const Time = Math.floor(Date.now() / 1000);
        const [data] = await con.execute("SELECT `userid`, `user_email`,`user_role`, `child_limit` FROM `user` where userid=? and payment_password=?",[userid, passwd]);

        if (data.length > 0) { console.log(data);
            return res.status(200).json({ data: data });
        } else {
			console.log("hello")
            return res.status(200).json({ message: "No user found." });
        }
    } catch (err) { console.log(err, "err");
        next(err);
    }
});




module.exports = router;
