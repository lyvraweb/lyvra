import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16"
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { plan, email, uid } = req.body;

    if (!plan || !uid) {
      return res.status(400).json({ error: "Missing plan or uid" });
    }

    const priceMap = {
      pro: process.env.STRIPE_PRICE_PRO,
      business: process.env.STRIPE_PRICE_BUSINESS
    };

    const priceId = priceMap[plan];
    if (!priceId) {
      return res.status(400).json({ error: "Invalid plan" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",

      payment_method_types: ["card"],

      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],

      customer_email: email || undefined,

      subscription_data: {
        metadata: {
          uid,
          plan
        }
      },

      success_url: `${process.env.APP_URL}/app.html?checkout=success`,
      cancel_url: `${process.env.APP_URL}/checkout.html?plan=${plan}&cancel=true`
    });

    res.status(200).json({ url: session.url });

  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ error: "Stripe checkout failed" });
  }
}
