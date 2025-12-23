// QR Code utility using the qrcode library
// This replaces external API calls with local generation

import QRCode from 'qrcode';

/**
 * Generate a QR code as a data URL (base64)
 * @param data - The data to encode in the QR code
 * @param size - The size of the QR code in pixels (default: 192)
 * @returns Promise<string> - The base64 data URL of the QR code
 */
export async function generateQRCodeDataURL(data: string, size: number = 192): Promise<string> {
  try {
    const qrDataUrl = await QRCode.toDataURL(data, {
      width: size,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    });
    return qrDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate a QR code as an SVG string
 * @param data - The data to encode in the QR code
 * @returns Promise<string> - The SVG string of the QR code
 */
export async function generateQRCodeSVG(data: string): Promise<string> {
  try {
    const svg = await QRCode.toString(data, {
      type: 'svg',
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    });
    return svg;
  } catch (error) {
    console.error('Error generating QR code SVG:', error);
    throw new Error('Failed to generate QR code');
  }
}
