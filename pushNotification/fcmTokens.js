const con = require("../dbConnection");

const saveFcmTokens = (userId, fcm_token) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (fcm_token != "" && fcm_token != undefined) {
                const timestamp = Math.floor(Date.now() / 1000);
                const [query] = await con.execute("SELECT * FROM `FcmTokens` WHERE `userId`=?", [userId]);
                if (query.length > 0) {
                    const [updated] = await con.execute("UPDATE `FcmTokens` SET `fcmToken`=? WHERE `userId`=?", [fcm_token, userId]);
                    if (updated.affectedRows) {
                        resolve(updated.affectedRows);
                    }
                } else {
                    const [insert] = await con.execute("INSERT INTO `FcmTokens`(`userId`, `fcmToken`, `timestamp`) VALUES (?, ?, ?)", [
                        userId,
                        fcm_token,
                        timestamp,
                    ]);
                    resolve(insert);
                }
            } else {
                resolve(1);
            }
        } catch (error) {
            reject(error);
        }
    })
}

module.exports = {
    saveFcmTokens
}