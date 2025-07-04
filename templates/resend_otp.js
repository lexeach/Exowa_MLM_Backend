const { URL } = require("./url");

const resendOtpMessage = (name, OTP) => {
    const arrayOfDigits = Array.from(String(OTP), Number);
    const otpSection = arrayOfDigits.map(digit => {
        return `<li>${digit}</li>`;
    }).join("");

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>2FA Authentication Code</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            max-width: 600px;
            margin: auto;
            background: #fff;
            padding: 30px;
            border-radius: 28px;
        }
        .code { 
            font-size: 24px;
            font-weight: bold;
            color: #333;
        }
        .footer {
            margin-top: 20px;
            font-size: 14px;
            color: #777;
        }
        .list_un {
            list-style: none;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 5px;
            margin: auto;
            padding-left: 0;
        }
        .list_un li {
            width: 40px;
            height: 40px;
            display: flex;
            align-content: center;
            justify-content: center;
            border: 1px solid #dfdfdf;
            border-radius: 8px;
            font-size: 26px;
            padding: 6px;
            font-weight: bold;
            font-weight: 500;
            color: #11100e;
        }
    </style>
</head>
<body>
    <div class="container">
        <div style="margin-bottom: 3rem">
            <a href="javascript:void()" style="text-decoration:none">
               <img alt="" border="0" src="${URL}/assets/img/logo.png"style="width:260px; height:auto; display:block;margin: auto;">
            </a>
        </div>
        <h1>OTP Verification</h1>
        <p>Hi ${name},</p>
        <p style="text-align: center;font-size: 20px;">Here is your 4-digit verification OTP code:</p>
        <ul class="list_un">
            ${otpSection}
        </ul>
        <div class="">
            <a href="javascript:void()" style="text-decoration:none">
                <img alt="" border="0" src="${URL}/api/assets/img/otps.png" style="width:100%; height:auto;display:block"  >
              </a>
        </div>
        <p>Please enter this code on the verification page to complete the authentication process. For security reasons, this code will expire in 10 minutes.</p>
        <p>If you did not request this code or believe this request was made in error, please ignore this email or contact our support team.</p>
        <p>Thank you for securing your account!</p>
        <p class="footer">Best regards,<br>The AUTASIS's Team</p>
 
    </div>
</body>
</html>`}

module.exports = resendOtpMessage;