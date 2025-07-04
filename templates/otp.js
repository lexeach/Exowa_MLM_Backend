const { URL, help_link, support_email } = require("./url");

const message = (OTP, fullname) => {
  const otpArray = OTP.toString().split("");
  return `
   <!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>One Time Password Verification</title>
    <style>
      @import url("https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap");

      body,
      h1,
      h2,
      h3,
      h4,
      h5,
      h6,
      span,
      button,
      input,
      select,
      div {
        font-family: "Inter", serif;
      }
      body {
        font-family: Arial, sans-serif;
        background-color: #f4f4f4;
        margin: 0;
        padding: 0;
      }
      .email-container {
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        margin-top: 30px;
        border-radius: 20px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        overflow: hidden;
      }
      .Registration_Successful {
        background-color: #4d33f8;
        padding: 30px;
      }
      .SuccessfulContainer img {
        width: 100%;
        height: 300px;
        object-fit: cover;
        border-radius: 12px;
        mix-blend-mode: multiply;
      }
      .marginBottom {
        margin-bottom: 1rem;
      }
      h1 {
        color: #fff;
        font-size: 30px;
        font-weight: 500;
        margin: 0;
        text-align: center;
      }
      h2 {
        color: #363636;
        font-size: 20px;
        margin-bottom: 15px;
      }
      .AccountDetails {
        display: flex;
        align-items: center;
        gap: 5px;
        justify-content: center;
      }
      .AccountDetails p{
        margin: 0;
        color: #4d33f8;
        font-size: 22px;
        background-color: #fbfbf4;
        padding: 10px 16px;
        border-radius: 10px;
        border: 1px solid #4d33f8;
      }
      p {
        color: #555555;
        font-size: 14px;
        font-weight: 500;
        line-height: 25px;
      }
      a {
        color: #4d33f8;
        text-decoration: none;
      }
      .details {
        font-size: 16px;
        margin-bottom: 20px;
      }
      .footer {
        font-size: 14px;
        color: #555555;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="Registration_Successful">
        <h1>Confirm your account!</h1>
      </div>
      <div class="SuccessfulContainer">
        <img src="${URL}/assets/img/sms-authentication.svg" class="" alt="" />
      </div>
      <div style="padding: 30px">
        <div class="marginBottom">
          <p>Dear Ms/Mr, <span style="color: #4d33f8">${fullname}</span>,</p>
          <p>
            Your confirmation code is below - enter it in your open browser
            window and we'll help you get signed in.
          </p>
        </div>
        <div class="AccountDetails marginBottom">
          <p>${otpArray[0]}</p>
          <p>${otpArray[1]}</p>
          <p>${otpArray[2]}</p>
          <p>${otpArray[3]}</p> 
          <p>${otpArray[4]}</p> 
          <p>${otpArray[5]}</p> 
        </div>

        <div class="marginBottom">
          <p>
            If you need any help or have questions, our support team is ready to
            assist. Feel free to reach out to us at
            <a href="mailto:${support_email}">${support_email}</a> or visit our
            <a href="${help_link}">help center</a>.
          </p>
          <p>Thanks again for joining us!</p>
        </div>

        <div class="">
          <p>
            Best regards,<br />
            The AUTASIS Team
          </p>
        </div>
      </div>
    </div>
    <div class="footer">
      <p>&copy; 2025 AUTASIS. All rights reserved.</p>
    </div>
  </body>
</html>

    `;
}
module.exports = { message };