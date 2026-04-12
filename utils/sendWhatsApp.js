const axios = require('axios');

const WHATSAPP_API_BASE = 'https://graph.facebook.com/v20.0';

const normalizeIndianPhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');

  if (!digits) return '';
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;

  return digits;
};

const buildTextPayload = ({ to, body }) => ({
  messaging_product: 'whatsapp',
  recipient_type: 'individual',
  to,
  type: 'text',
  text: {
    preview_url: false,
    body,
  },
});

const buildTemplatePayload = ({ to, templateName, bodyValues = [] }) => ({
  messaging_product: 'whatsapp',
  recipient_type: 'individual',
  to,
  type: 'template',
  template: {
    name: templateName,
    language: {
      code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en',
    },
    components: bodyValues.length
      ? [
          {
            type: 'body',
            parameters: bodyValues.map((text) => ({
              type: 'text',
              text: String(text ?? ''),
            })),
          },
        ]
      : undefined,
  },
});

const sendPayload = async (payload) => {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.warn('WhatsApp API not configured. Skipping outbound message.');
    return;
  }

  await axios.post(`${WHATSAPP_API_BASE}/${phoneNumberId}/messages`, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    timeout: 10000,
  });
};

const sendMessage = async ({ to, text, templateName, bodyValues = [] }) => {
  const normalizedPhone = normalizeIndianPhone(to);
  if (!normalizedPhone) return;

  const payload = templateName
    ? buildTemplatePayload({ to: normalizedPhone, templateName, bodyValues })
    : buildTextPayload({ to: normalizedPhone, body: text });

  await sendPayload(payload);
};

const buildBookingMessages = ({ booking, eventType }) => {
  const bookingId = String(booking?._id || booking?.bookingId || '');
  const customerName = booking?.name || 'Customer';
  const pickup = booking?.pickupLocation || 'N/A';
  const drop = booking?.dropLocation || 'N/A';
  const tripDate = [booking?.pickupDate, booking?.pickupTime].filter(Boolean).join(' ');
  const amount = booking?.advanceAmount || booking?.totalFare || 0;
  const paymentMode = booking?.paymentMode || 'N/A';
  const utr = booking?.utr || '';

  const baseCustomerText = `Itarsi Taxi booking update
Booking ID: ${bookingId}
Name: ${customerName}
Route: ${pickup} -> ${drop}
Trip time: ${tripDate || 'TBD'}
Payment mode: ${paymentMode}`;

  if (eventType === 'cash_booking_created') {
    return {
      customer: {
        text: `${baseCustomerText}
Status: Booking received. Our team will contact you soon.`,
        templateName: process.env.WHATSAPP_CUSTOMER_BOOKING_TEMPLATE,
        bodyValues: [customerName, bookingId, pickup, drop, tripDate || 'TBD', paymentMode],
      },
      admin: {
        text: `New cash booking
Booking ID: ${bookingId}
Name: ${customerName}
Phone: ${booking?.mobile || 'N/A'}
Route: ${pickup} -> ${drop}
Trip time: ${tripDate || 'TBD'}
Estimated fare: Rs ${booking?.totalFare || 0}`,
        templateName: process.env.WHATSAPP_ADMIN_BOOKING_TEMPLATE,
        bodyValues: [bookingId, customerName, booking?.mobile || 'N/A', pickup, drop, tripDate || 'TBD', booking?.totalFare || 0],
      },
    };
  }

  if (eventType === 'upi_booking_started') {
    return {
      customer: {
        text: `${baseCustomerText}
Advance amount: Rs ${amount}
Status: UPI payment started. Complete the payment and submit your UTR in the app.`,
        templateName: process.env.WHATSAPP_CUSTOMER_UPI_TEMPLATE,
        bodyValues: [customerName, bookingId, amount, tripDate || 'TBD'],
      },
      admin: {
        text: `UPI booking started
Booking ID: ${bookingId}
Name: ${customerName}
Phone: ${booking?.mobile || 'N/A'}
Advance amount: Rs ${amount}
Route: ${pickup} -> ${drop}`,
        templateName: process.env.WHATSAPP_ADMIN_UPI_TEMPLATE,
        bodyValues: [bookingId, customerName, booking?.mobile || 'N/A', amount, pickup, drop],
      },
    };
  }

  if (eventType === 'upi_proof_submitted') {
    return {
      customer: {
        text: `${baseCustomerText}
UTR: ${utr}
Status: Payment proof received. Our team will verify it shortly.`,
      },
      admin: {
        text: `UPI proof submitted
Booking ID: ${bookingId}
Name: ${customerName}
Phone: ${booking?.mobile || 'N/A'}
UTR: ${utr}
Advance amount: Rs ${amount}`,
      },
    };
  }

  return {};
};

const sendBookingWhatsAppAlerts = async ({ booking, eventType }) => {
  try {
    const messages = buildBookingMessages({ booking, eventType });
    const deliveries = [];

    if (messages.admin && process.env.ADMIN_PHONE) {
      deliveries.push(
        sendMessage({
          to: process.env.ADMIN_PHONE,
          text: messages.admin.text,
          templateName: messages.admin.templateName,
          bodyValues: messages.admin.bodyValues,
        })
      );
    }

    if (booking?.whatsappOptIn !== false && booking?.mobile && messages.customer) {
      deliveries.push(
        sendMessage({
          to: booking.mobile,
          text: messages.customer.text,
          templateName: messages.customer.templateName,
          bodyValues: messages.customer.bodyValues,
        })
      );
    }

    await Promise.allSettled(deliveries);
  } catch (error) {
    console.error('WhatsApp alert error:', error.response?.data || error.message || error);
  }
};

module.exports = {
  normalizeIndianPhone,
  sendBookingWhatsAppAlerts,
};
