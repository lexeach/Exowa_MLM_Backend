const con = require('../dbConnection');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
const saveUserNotifications = require('../controllers/saveUserNotifications');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});


async function sendNotificationToDevice(userIds, deviceTokens, title, body, imageUrl = '') {
    // Convert single deviceToken and userId to arrays if they are not already
    const tokens = Array.isArray(deviceTokens) ? [...new Set(deviceTokens)] : [deviceTokens];
    const userIdsArray = Array.isArray(userIds) ? [...new Set(userIds)] : [userIds];

    // Save notifications for each user
    await Promise.all(userIdsArray.map(id => saveUserNotifications(id, body, "isnotification", imageUrl)));

    const message = {
        notification: {
            title,
            body,
        },
        tokens,
        data: {
            image: imageUrl,
        },
    };

    // Send the message to the device tokens
    try {
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log('Successfully sent message:', response);
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

async function pushNotifications(title, messages, tableName, column, columnValue) {
    try {
        const [rows] = await con.execute(`SELECT userId FROM ${tableName} WHERE ${column} = ?`, [columnValue]);

        if (rows.length) {
            const { userId } = rows[0];
            const [tokens] = await con.execute("SELECT fcmToken FROM FcmTokens WHERE userId = ?", [userId]);

            if (tokens.length) {
                await sendNotificationToDevice([userId], tokens.map(token => token.fcmToken), title, messages);
            }
        }
    } catch (error) {
        console.error("Error in pushNotifications:", error);
    }
}

const directSendMessage = async (title, messages, registrationTokens) => {
    const message = {
        notification: {
            title,
            body: messages,
        },
        tokens: registrationTokens, // Ensure this is an array of tokens
    };

    try {
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log('Successfully sent message:', response);

        response.responses.forEach((response, index) => {
            if (!response.success) {
                console.error(`Failed to send to token ${registrationTokens[index]}: ${response.error.message}`);
            }
        });
    } catch (error) {
        console.error('Error sending message:', error.code, error.message);
    }
}

// Example usage
const deviceTokens = [
    'fAl0isuASo-bxGkgKIRI0S:APA91bF0M6CO0uUymilTonFvOxZBilFyxfvi08YArmpkMns0CmOfnPRxpvsB_k8_h0YfQFAU8j95VX9Cq6vsO-qbqvzDCmKDsWQbRQnolha8-TxF2hISvKFD4u5gkpQkxbkttR09OB0U',
    'cPclpJ3fRIqaOHGR9a5M1d:APA91bFXXKZ0MHHAI1JRWeu--OCDCmit7dD9-1aVOjX5ASiQxgltS0gUoiXm701EtzQTAQyiD4SdKPWWlk4gNt5ySoneVJ5fOHufGDRK8aKcWmRffwMpb6_QcL9Yl6ZPJSEyP6rMzfVp'
];
const title = 'New Message!';
const body = 'You have a new message in your inbox sonu.';

// Call the function
// directSendMessage(title, body, deviceTokens);
// sendNotificationToGamePlayers(title, body, "users", "userId", 44510961);


async function sendNotificationToGamePlayers(title, messages, tableName, column, columnValue) {
    try {
        const [rows] = await con.execute(`SELECT userId FROM ${tableName} WHERE ${column} = ?`, [columnValue]);

        if (rows.length) {
            const { userId } = rows[0];
            const [token] = await con.execute("SELECT fcmToken FROM FcmTokens WHERE userId = ?", [userId]);

            if (token.length) {

                const message = {
                    notification: {
                        title,
                        body: messages,
                    },
                    token: token[0].fcmToken,
                    // data: {
                    //     image: imageUrl,
                    // },
                };

                // console.log(message, " message")

                // Send the message to the device tokens
                try {
                    const response = await admin.messaging().send(message);
                    console.log('Successfully sent message:', response);
                } catch (error) {
                    console.error('Error sending message:', error);
                }
            }
        }
    } catch (error) {
        console.error("Error in pushNotifications:", error);
    }
}

module.exports = {
    sendNotificationToDevice,
    pushNotifications,
    sendNotificationToGamePlayers,
    admin
};
