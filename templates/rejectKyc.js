const { URL } = require("./url");

const kycVerificationReject = (name, rejectionReason) => {
    return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml"
    xmlns:o="urn:schemas-microsoft-com:office:office">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="x-apple-disable-message-reformatting">
    <title></title>

    <link href="https://fonts.googleapis.com/css?family=Roboto:400,600" rel="stylesheet" type="text/css">
    <style>
        html,
        body {
            margin: 0 auto !important;
            padding: 0 !important;
            height: 100% !important;
            width: 100% !important;
            font-family: 'Roboto', sans-serif !important;
            font-size: 14px;
            margin-bottom: 10px;
            line-height: 24px;
            color: #8094ae;
            font-weight: 400;
        }

        * {
            -ms-text-size-adjust: 100%;
            -webkit-text-size-adjust: 100%;
            margin: 0;
            padding: 0;
        }

        table,
        td {
            mso-table-lspace: 0pt !important;
            mso-table-rspace: 0pt !important;
        }

        table {
            border-spacing: 0 !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            margin: 0 auto !important;
        }

        table table table {
            table-layout: auto;
        }

        a {
            text-decoration: none;
        }

        img {
            -ms-interpolation-mode: bicubic;
        }
    </style>
</head>

<body width="100%" style="margin: 0; padding: 0 !important; mso-line-height-rule: exactly; background-color: #f5f6fa;">
    <center style="width: 100%; background-color: #f5f6fa;">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#f5f6fa">
            <tr>
                <td style="padding: 40px 0;">
                    <table style="width:100%;max-width:620px;margin:0 auto;">
                        <tbody>
                            <tr>
                                <td style="text-align: center; padding-bottom:25px">
                                    <a href="#"><img style="height: 100px"
                                            src="${URL}/assets/img/logo.png"
                                            alt="logo"></a>
                                    <h4 style="font-size: 22px; color: #27aee6; padding-top: 12px;">Welcome to PEAFX
                                    </h4>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <table style="width:100%;max-width:620px;margin:0 auto;background-color:#ffffff;">
                        <tbody>
                            <tr>
                                <td style="text-align:center;padding: 50px 30px;">
                                    <img style="width:250px; margin-bottom:24px;"
                                        src="${URL}/assets/img/unsuccessfull-kyc.jpg"
                                        alt="In Process">
                                    <h2 style="font-size: 25px; color: #27aee6; font-weight: 600; margin-bottom: 15px;">
                                        Dear ${name},</h2>

                                    <h2 style="font-size: 18px; color: #27aee6; font-weight: 400; margin-bottom: 8px;">
                                        We regret to inform you that your account verification request has been
                                        rejected.</h2>

                                    <!-- Rejection Reason Section -->
                                    <h3 style="font-size: 18px; color: #ff0000; font-weight: 400; margin-bottom: 8px;">
                                        Reason for Rejection:</h3>
                                    <p style="font-size: 16px; color: #8094ae; margin-bottom: 20px;">
                                        ${rejectionReason}
                                    </p>

                                    <h2 style="font-size: 18px; color: #27aee6; font-weight: 400; margin-bottom: 8px;">
                                        If you have any questions or concerns, please feel free to contact our
                                        support team.</h2>
                                </td>
                            </tr>
                            <tr>
                                <td style="text-align:right;padding: 50px 30px;">
                                    <p style="margin-bottom: 10px;">Best regards,</p>
                                    <p style="margin-bottom: 10px;">PEAFX Team</p>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <table style="width:100%;max-width:620px;margin:0 auto;">
                        <tbody>
                            <tr>
                                <td style="text-align: center; padding:25px 20px 0;">
                                    <p style="font-size: 13px;">Copyright © 2024 <a
                                            style="color: #27aee6; text-decoration:none;" href="">PEAFX.</a> All rights
                                        reserved.</p>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </td>
            </tr>
        </table>
    </center>
</body>

</html>`

}

module.exports = kycVerificationReject;