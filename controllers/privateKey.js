require('dotenv').config();
const CryptoJS = require("crypto-js");

const secret_key = process.env.PRIVATE_SECRET_KEY;

const encryptPrivateKey = (privateKey) => {
    return new Promise((resolve, reject) => {
        try {
            var cipherPrivate = CryptoJS.AES.encrypt(privateKey, secret_key).toString();
            resolve(cipherPrivate);
        } catch (error) {
            console.log(error, " error")
            reject(error);
        }
    })
}

const dcryptPrivateKey = (cipherPrivateKey) => {
    return new Promise((resolve, reject) => {
        try {
            const bytes = CryptoJS.AES.decrypt(cipherPrivateKey, secret_key);
            const originalprivateKey = bytes.toString(CryptoJS.enc.Utf8);
            resolve(originalprivateKey);
        } catch (error) {
            reject(error);
        }
    })
}

module.exports = {
    encryptPrivateKey,
    dcryptPrivateKey
}