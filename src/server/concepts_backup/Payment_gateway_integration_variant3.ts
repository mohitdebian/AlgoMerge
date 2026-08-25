import Stripe from "stripe";
const stripe = new Stripe("sk_test_123");
async function processPayment() {
  const stripeInstance = stripe as any;
}
