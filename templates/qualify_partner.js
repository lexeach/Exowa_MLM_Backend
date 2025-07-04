const { URL } = require("./url");

const qualifyMessage = (fullname, support_email) => {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/x-icon" href="${URL}/assets/img/logo.png">
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Partnership Qualification</title>
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
      .header {
        background-color: #4d33f8;
        padding: 30px;
        text-align: center;
      }
      .content-img {
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
      .highlight {
        color: #4d33f8;
        font-weight: 600;
      }
      .footer {
        font-size: 14px;
        color: #555555;
        text-align: center;
        padding: 20px;
      }
      .content {
        padding: 30px;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="header">
        <h1>Partnership Qualification Approved</h1>
      </div>
      <div class="content">
        <img src="${URL}/assets/img/partnership-success.webp" class="content-img" alt="Partnership approved" />
        
        <div class="marginBottom">
          <p>Dear <span class="highlight">${fullname}</span>,</p>
          <p>
            We are pleased to inform you that your account has been <strong>officially qualified</strong> for partnership by our admin team.
          </p>
        </div>
        
        <div class="marginBottom">
          <h2>What This Means For You:</h2>
          <p>✓ Access to partner-level benefits and features</p>
          <p>✓ Eligibility for partnership rewards and bonuses</p>
          <p>✓ Priority support for your business needs</p>
        </div>

        <div class="marginBottom">
          <p>
            Our team will contact you shortly with the next steps to activate your partnership privileges.
          </p>
          <p>
            If you have any immediate questions, please contact our support team at 
            <a href="mailto:${support_email}">${support_email}</a>.
          </p>
        </div>

        <div>
          <p>
            Welcome to the AUTASIS partnership program!<br />
            We look forward to achieving great success together.
          </p>
        </div>
      </div>
      
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} AUTASIS. All rights reserved.</p>
      </div>
    </div>
  </body>
</html>`;
};

module.exports = { qualifyMessage };