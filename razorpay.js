const Razorpay = require('razorpay');
const dotenv = require('dotenv');

dotenv.config();

const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_quickfix12345';
const key_secret = process.env.RAZORPAY_KEY_SECRET || 'quickfix_razorpay_secret_key';

let razorpayInstance = null;

try {
  razorpayInstance = new Razorpay({
    key_id: key_id,
    key_secret: key_secret
  });
} catch (err) {
  console.warn('⚠️ Razorpay SDK Initialization Warning:', err.message);
}

module.exports = {
  razorpayInstance,
  key_id,
  key_secret
};
