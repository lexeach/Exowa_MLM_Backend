const bcrypt = require('bcrypt');
const crypto = require('crypto');


const encryptPassword = async (password) => {
    try {
        const salt = await bcrypt.genSalt(10)
        const hash = await bcrypt.hash(password, salt)
        return hash;
    } catch (err) {
        throw new Error(err);
    }
}

const decryptPassword = async (password, confirmPassword) => {
    try {
        return await bcrypt.compare(password, confirmPassword)
    } catch (err) {
        return false;
    }
}

function generateStrongPassword(length = 16) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    const values = crypto.randomBytes(length);
    let password = '';

    for (let i = 0; i < length; i++) {
        password += charset[values[i] % charset.length];
    }

    // Ensure at least one of each character type
    if (!/[A-Z]/.test(password)) password = 'A' + password.slice(1);
    if (!/[a-z]/.test(password)) password = 'a' + password.slice(1);
    if (!/[0-9]/.test(password)) password = '1' + password.slice(1);
    if (!/[!@#$%^&*()]/.test(password)) password = '!' + password.slice(1);

    return password;
}



module.exports = {
    encryptPassword,
    decryptPassword,
    generateStrongPassword
}