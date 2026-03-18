import twilio from 'twilio';

function getCredentials() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const phoneNumber = process.env.OTP_FROM_NUMBER;

  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not set. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in environment variables.');
  }

  return { accountSid, authToken, phoneNumber };
}

export async function getTwilioClient() {
  const { accountSid, authToken } = getCredentials();
  return twilio(accountSid, authToken);
}

export async function getTwilioFromPhoneNumber() {
  const { phoneNumber } = getCredentials();
  return phoneNumber;
}
