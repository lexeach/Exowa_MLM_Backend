const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = async (req, res, next) => {
    const token = req.headers["x-access-token"];
    if (!token) {
        return res.status(403).json({ message: 'Unauthorize request' });
    }
    try {
        const decode = jwt.verify(token, process.env.JWT_SECRET);
        // console.log(decode);
        req.user = decode;
    } catch (err) {
        console.log('error in verifyToken', err);
        return res.status(401).json({ message: "Invalid Token" })
    }
    return next();
}

module.exports = verifyToken;