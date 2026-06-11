const brevo = require('@getbrevo/brevo');
const User = require('../models/User');

const extractEmail = (emailString) => {
    if (!emailString) return '';
    const match = emailString.match(/<(.+?)>/);
    return match ? match[1] : emailString.trim();
};

const sendEmail = async ({ email, emailType, userId }) => {
    try {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await User.findByIdAndUpdate(userId, {
            verifyToken: otp,
            verifyTokenExpiry: Date.now() + 3600000 // 1 hour
        });

        if (!process.env.BREVO_API_KEY) {
            console.log("========================================");
            console.log(`[MAIL SIMULATION] To: ${email}`);
            console.log(`Subject: ${emailType === "VERIFY" ? "Verify your email" : "Reset your password"}`);
            console.log(`Your OTP Code is: ${otp}`);
            console.log("========================================");
            return { message: "Simulated email send", otp };
        }

        const apiInstance = new brevo.TransactionalEmailsApi();
        apiInstance.setApiKey(
            brevo.TransactionalEmailsApiApiKeys.apiKey,
            process.env.BREVO_API_KEY
        );

        const senderEmail = process.env.EMAIL_FROM ? extractEmail(process.env.EMAIL_FROM) : "support@event.com";

        const sendSmtpEmail = new brevo.SendSmtpEmail();
        sendSmtpEmail.subject = emailType === "VERIFY" ? "Verify your email" : "Reset your password";
        sendSmtpEmail.htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
                <h2 style="color: #4F46E5; text-align: center;">Virtual Event Platform</h2>
                <p style="font-size: 16px; color: #4b5563;">Your OTP code to ${emailType === "VERIFY" ? "verify your email" : "reset your password"} is:</p>
                <div style="background-color: #f3f4f6; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e1b4b;">${otp}</span>
                </div>
                <p style="font-size: 14px; color: #6b7280; text-align: center;">This code will expire in 1 hour. Do not share it with anyone.</p>
            </div>
        `;

        const senderName = process.env.BREVO_SENDER_NAME || process.env.EMAIL_SENDER_NAME || "Event Platform";
        sendSmtpEmail.sender = { "name": senderName, "email": senderEmail };

        sendSmtpEmail.to = [{ "email": email, "name": "User" }];

        const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
        return data;
    } catch (error) {
        console.error("Error sending email:", error);
        throw new Error(error.message);
    }
};

module.exports = { sendEmail };
