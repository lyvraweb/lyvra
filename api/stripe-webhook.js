import Stripe from "stripe";
import admin from "firebase-admin";
import { buffer } from "micro";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    )
  });
}

const db = admin.firestore();

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  const sig = req.headers["stripe-signature"];
  const buf = await buffer(req);

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send("Webhook Error");
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const sub = await stripe.subscriptions.retrieve(session.subscription);

    const { uid, plan } = sub.metadata;

    await db.collection("users").doc(uid).set(
      {
        plan,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object;
    const uid = sub.metadata.uid;

    await db.collection("users").doc(uid).set(
      { plan: "free" },
      { merge: true }
    );
  }

  res.json({ received: true });
}
