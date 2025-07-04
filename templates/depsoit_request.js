const { URL } = require("./url");

const message = (inovice, fullname, time, deposit_amount, deposit_dollar, payment_mode, payment_ref, support_email, status) => {

  return ` <!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/x-icon" href="${URL}/assets/img/logo.png">
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Deposit Invoice</title>
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
        height: 240px;
        object-fit: contain;
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
        <h1>Deposit Invoice - ${inovice} from AUTASIS</h1>
      </div>
      <div class="SuccessfulContainer">
        <img src="${URL}/assets/img/money-banking-financial.webp" class="" alt="" />
      </div>
      <div style="padding: 30px">
        <div class="marginBottom">
          <p>Dear Ms/Mr, <span style="color: #4d33f8">${fullname}</span>,</p>
          <p>
            Thank you for your deposit! We’ve received your payment, and your invoice is now available for your records.
          </p>
        </div>
        <div class="marginBottom">
            <h2>Invoice Details:</h2>
            <p class="details"><span>Invoice Number:</span> ${inovice}</p>
            <p class="details"><span>Invoice Date:</span> ${time}</p>
            <p class="details"><span>Amount Paid:</span> ${deposit_amount} INR / $ ${deposit_dollar}</p>
            <p class="details"><span>Payment Method:</span> ${payment_mode}</p>       
            <p class="details"><span>Transaction Ref:</span> ${payment_ref}</p> 
            <p class="details"><span>Deposit Request Status:</span> ${status}</p>         
        </div>

        <div class="marginBottom">
          <p>
            If you have any questions or need further assistance, feel free to reach out to us at <a href="mailto:${support_email}">${support_email}</a>.
          </p>
          <p>We greatly appreciate your business and look forward to continuing to serve you!</p>
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