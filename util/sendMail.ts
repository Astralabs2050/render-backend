import nodemailer from "nodemailer";

// Function to send an email
async function sendEmail(
  receiverEmail: string,
  subject: string,
  message: string,
) {
  // Create a transporter object using SMTP settings
  var smtpConfig = {
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // use SSL
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  };
  const transporter = nodemailer.createTransport(smtpConfig);

  // Setup email data
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: receiverEmail,
    subject: subject,
    html: message, // Use 'html' to send HTML content
  };

  // Send the email
  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully!");
  } catch (error) {
    console.error("Error sending email:", error);
  }
}
export default sendEmail;
// Example usage
// Example usage
// const receiverEmail = "lawblaze4@gmail.com"; // Replace with actual recipient email
// const subject = "Thank you for trying out Astra!";
// const message = `<b>Test message</b>`; // HTML content

// sendEmail(receiverEmail, subject, message).catch(console.error);
