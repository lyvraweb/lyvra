const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  try {
    const { plan, email, uid } = req.body;
    const priceId = plan === 'pro' ? process.env.STRIPE_PRICE_PRO : process.env.STRIPE_PRICE_BUSINESS;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: process.env.APP_URL + '/app?checkout=success&plan=' + plan,
      cancel_url: process.env.APP_URL + '/checkout.html?plan=' + plan + '&cancel=true',
      customer_email: email,
      metadata: { uid }
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};