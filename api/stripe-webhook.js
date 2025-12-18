import Stripe from "stripe";
import admin from "firebase-admin";
import { buffer } from "micro";

export const config = {
  api: {
    bodyParser: false
  }
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Firebase Admin
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
    return res.status(405).end("Method Not Allowed");
  }

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
    console.error("Webhook signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Checkout concluído
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

   const uid = session.metadata?.uid;
const plan = session.metadata?.plan;

if (!uid || !plan) {
  console.error("Webhook inválido: metadata ausente", session.metadata);
  return res.json({ received: true });
}

await db.collection("users").doc(uid).set(
  {
    plan,
    stripeCustomerId: session.customer,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  },
  { merge: true }
);
  }

  res.json({ received: true });
}
