import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// Define the transporter with correct typing
const transporter = nodemailer.createTransport({
  service: "Gmail", // Adjust as necessary
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER as string,
    pass: process.env.EMAIL_PASS as string,
  },
});

export default transporter;