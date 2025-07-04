const con = require('../dbConnection/index');

const saveUserNotifications = async (userId, action, type, imageUrl = '') => {
    const time = Math.floor(Date.now() / 1000);
    await con.execute("INSERT INTO `notification_history`(`userId`, `action`, `type`, `status`, `time`, `imageUrl`) VALUES(?,?,?,?,?,?)", [userId, action, type, 0, time, imageUrl]);

}

module.exports = saveUserNotifications;