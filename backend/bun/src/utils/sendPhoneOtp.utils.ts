import Sentry from '../config/sentry.config';
import { twilioClient } from '../config/twilio.config';

const sendOtp = async (phoneNumber: string, otp: string) => {
  try {
    await twilioClient.messages.create({
      body: `Your SyncFlow OTP code is: ${otp}. Please do not share it with anyone.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });
    console.log(`OTP sent to ${phoneNumber}`);

    return {
      status: true,
      message: 'OTP sent successfully',
    };
  } catch (error) {
    console.error('[SendOtpError]', error);
    Sentry.captureException(error);
    throw new Error('Failed to send OTP');
  }
};
