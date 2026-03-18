import { Resend } from 'resend';

export async function getUncachableResendClient(): Promise<{
  client: Resend;
  fromEmail: string;
}> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY not set in environment variables');
  }

  const fromEmail = process.env.EMAIL_FROM_ADDRESS || 'noreply@alshaye.com';

  return {
    client: new Resend(apiKey),
    fromEmail,
  };
}

export async function sendEmailViaResendConnector(options: {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  fromName?: string;
  replyTo?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();

    const from = options.fromName
      ? `${options.fromName} <${fromEmail}>`
      : fromEmail;

    // Build payload - Resend requires at least one of html or text
    const emailPayload = {
      from,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    };

    // @ts-expect-error - Resend SDK types are strict but we ensure html or text is always provided by callers
    const response = await client.emails.send(emailPayload);

    if (response.error) {
      return { success: false, error: response.error.message };
    }

    return { success: true, messageId: response.data?.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending email'
    };
  }
}

export async function isResendConnectorAvailable(): Promise<boolean> {
  return !!process.env.RESEND_API_KEY;
}
