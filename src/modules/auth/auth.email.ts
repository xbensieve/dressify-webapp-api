/**
 * Builds the HTML email for account activation.
 */
export const buildActivationEmail = (confirmationCode: string, activationLink: string): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4; }
    .container { max-width:600px;margin:auto;background:#fff;padding:30px 20px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.05); }
    .header { text-align:center;padding-bottom:20px; }
    .header h1 { color:#004e89;margin:0; }
    .message { font-size:16px;color:#333;line-height:1.5; }
    .code { font-size:24px;color:#004e89;background:#eef3f9;padding:12px 20px;display:inline-block;border-radius:6px;font-weight:700;letter-spacing:2px;margin:20px 0; }
    .btn { display:inline-block;margin:20px 0;padding:12px 24px;background:#004e89;color:#fff!important;text-decoration:none;border-radius:6px;font-size:18px;font-weight:700; }
    .footer { font-size:12px;color:#999;text-align:center;margin-top:40px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to XBensieve</h1>
      <p style="margin:5px 0;color:#666">Complete Your Registration</p>
    </div>
    <div class="message">
      <p>Hello,</p>
      <p>Thank you for signing up with <strong>XBensieve</strong>. To activate your account, enter the confirmation code below or click the activation link:</p>
      <div class="code">${confirmationCode}</div>
      <p><a href="${activationLink}" class="btn">Activate Account</a></p>
      <p>This code and link are valid for the next 24 hours. If you did not request this, please disregard this message.</p>
      <p>— The XBensieve Team</p>
    </div>
    <div class="footer">&copy; ${new Date().getFullYear()} XBensieve. All rights reserved.</div>
  </div>
</body>
</html>`;
