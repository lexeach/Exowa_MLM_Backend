const { URL } = require("./url");

const message = (OTP) => {

  return `    
<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/x-icon" href="${URL}/assets/img/logo.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link
    href="https://fonts.googleapis.com/css2?family=Arvo:ital,wght@0,400;0,700;1,400;1,700&family=Nunito:wght@200;300;400;500;600;700;800;900;1000&display=swap"
    rel="stylesheet">
  <title>Forgot</title>
</head>

<body>
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout:fixed;background-color:#fff"
    id="bodyTable">
    <tbody>
      <tr>
        <td style="padding-right:10px;padding-left:10px;" align="center" valign="top" id="bodyCell">

          <table border="0" cellpadding="0" cellspacing="0" width="100%" class="wrapperBody"
            style="max-width:500px;margin-top: 10px">
            <tbody>
              <tr>
                <td align="center" valign="top">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" class="tableCard" style="background-color: #fbfbfb; border-color: #e5e5e5; border: 1px solid #e3e3e3;
                  border-style: solid;   border-radius: 5px;  padding: 15px;">
                    <tbody>

                      <tr style="">
                        <td style="padding-bottom: 10px;" align="center" valign="middle" class="emailLogo">
                          <a href="javascript:void()" style="text-decoration:none">
                            <img alt="" border="0" src="${URL}/assets/img/forgot.webp"
                              style="width:100%; height:auto; display:block">
                          </a>
                        </td>
                      </tr>

                      <tr>
                        <td
                          style="padding-top: 20px;padding-bottom: 10px; padding-left: 15px; padding-right: 20px; text-align: center;"
                          valign="top" class="subTitle">
                          <h4 class="text"
                            style=" color:#000;font-family:'Nunito';font-size:22px;font-weight:600;font-style:normal;letter-spacing:normal;line-height:32px;text-transform:none;text-align:center;padding:0;margin:0">
                            Someone requested that the password be reset for the following account. </h4>
                        </td>
                      </tr>

                      <tr>
                        <td
                          style="padding-top: 10px;padding-bottom: 10px; padding-left: 15px; padding-right: 20px; text-align: left;"
                          valign="top" class="subTitle">
                          <h4 class="text"
                            style=" color:#000;font-family:'Nunito';font-size:18px;font-weight:300;font-style:normal; line-height:24px;text-transform:none;text-align:center;padding:0;margin:0">
                            To reset your password, use the following OTP
                          </h4>
                        </td>
                      </tr>

                      <tr>
                        <td
                          style="padding-top: 10px;padding-bottom: 10px; padding-left: 15px; padding-right: 20px; text-align: left;"
                          valign="top" class="subTitle">
                          <h4 class="text"
                            style=" color:#fff; font-family:'Nunito';font-size:35px;font-weight:700; background: #09628e; letter-spacing: 15px; font-style:normal;
                             line-height:26px;text-transform:none;text-align:center;padding:15px; border-radius: 5px; margin:0">
                            ${OTP}
                          </h4>
                        </td>
                      </tr>
 

                     

                      <tr>
                        <td
                          style="padding-top: 20px;padding-bottom: 10px; padding-left: 15px; padding-right: 20px; text-align: center;"
                          valign="top" class="subTitle">
                          <h4 class="text"
                            style=" color:#000;font-family:'Nunito';font-size:20 px;font-weight:bold;font-style:normal;letter-spacing:normal;line-height:24px;text-transform:none;text-align:center;padding:0;margin:0">
                            Warm Regards
                          </h4>
                        </td>
                      </tr>

                      <tr>
                        <td
                          style="padding-top: 0px;padding-bottom: 0px; padding-left: 15px; padding-right: 20px; text-align: left;"
                          valign="top" class="subTitle">
                          <h4 class="text"
                            style="margin-left: 15px; color:#fff;font-family:'Nunito';font-size:18px;font-weight:600;font-style:normal;letter-spacing:0px;line-height:24px;text-transform:none;text-align:center;padding:0;margin:0">
                            <img alt="" border="0" src="assets/img/logo.png"
                              style="max-width:80px; display:block; margin: 0 auto">
                            &nbsp;
                          </h4>
                        </td>
                      </tr>

                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </tbody>
  </table>
</body>

</html>
    `;
}
module.exports = { message };