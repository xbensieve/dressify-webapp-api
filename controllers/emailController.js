import mailer from "../utils/mailer.js";

let sendEmail = async (req, res) => {
  try {
    const { email, subject, message } = req.body;
    await mailer.sendMail(email, subject, message);
    res.sendEmail("<h3>Email sent successfully</h3>");
  } catch (error) {
    console.error("Error sending email:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send email",
    });
  }
};

module.exports = {
  sendEmail: sendEmail,
};
