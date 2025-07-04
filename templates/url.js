require('dotenv').config();
const URL = process.env.BASE_URI;
const help_link = process.env.help_link;
const support_email = process.env.support_email;
module.exports = { URL, support_email, help_link}