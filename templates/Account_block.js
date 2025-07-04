const { URL, support_email } = require("./url");

const message = (userid, useremail, fullname, statuss, comment, time) => {

  return `
  <!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/x-icon" href="${URL}/assets/img/logo.png">
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Account block unblock</title>
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
        height: 266px;
        object-fit: contain; 
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
        color: #111;
        font-size: 20px;
        margin-bottom: 15px;
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
        font-size: 14px; 
      }
      .details span {
       color: #111; 
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
        <h1>Account Status Update: ${statuss} AUTASIS</h1>
      </div>
       
      <div style="padding: 30px">
        <div class="marginBottom">
          <p>Dear Ms/Mr, <span style="color: #4d33f8">${fullname}</span>,</p>
          <p>We wanted to notify you that your account has been ${statuss} due to ${comment}.</p>
        </div>
        <p>Account Action Details:</p>
        <div class="marginBottom"> 
            <p class="details"><span>User Id:</span> ${userid}</p>
            <p class="details"><span>User Email:</span> ${useremail}</p>
            <p class="details"><span>Date of Action:</span> ${time}</p>
            
        </div>

        <div class="marginBottom">
            <p>If you believe this action was taken in error or you need further assistance, please reach out to our support team at ${support_email}. We’re here to help!</p>
             
            <p>Thank you for your understanding.</p>
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