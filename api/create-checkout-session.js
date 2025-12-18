import Stripe from "stripe";
import admin from "firebase-admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16"
});

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    )
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { plan, uid, email } = req.body;
    if (!plan || !uid) {
      return res.status(400).json({ error: "Missing data" });
    }

    const priceMap = {
      pro: process.env.STRIPE_PRICE_PRO,
      business: process.env.STRIPE_PRICE_BUSINESS
    };

    const priceId = priceMap[plan];
    if (!priceId) {
      return res.status(400).json({ error: "Invalid plan" });
    }

    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();

    let customerId = userSnap.data()?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { uid }
      });

      customerId = customer.id;

      await userRef.set(
        { stripeCustomerId: customerId },
        { merge: true }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: { uid, plan }
      },
      success_url: `${process.env.APP_URL}/app.html?checkout=success`,
      cancel_url: `${process.env.APP_URL}/checkout.html?cancel=true`
    });

    res.status(200).json({ url: session.url });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Checkout failed" });
  }
}
