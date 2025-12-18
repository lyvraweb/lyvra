import Stripe from "stripe";
import admin from "firebase-admin";
import { buffer } from "micro";

export const config = {
  api: {
    bodyParser: false
  }
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    )
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  console.log("🔥 WEBHOOK RECEBIDO");
  
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
    return res.status(400).send("Webhook Error");
  }
  console.log("EVENT TYPE:", event.type);


  /* ================= CHECKOUT CONCLUÍDO ================= */
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const subscription = await stripe.subscriptions.retrieve(
      session.subscription
    );

    const uid = subscription.metadata.uid;
    const plan = subscription.metadata.plan;

    if (uid && plan) {
      await db.collection("users").doc(uid).set(
        {
          plan,
          stripeCustomerId: session.customer,
          stripeSubscriptionId: subscription.id,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    }
  }

  /* ================= CANCELAMENTO ================= */
  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object;
    const uid = sub.metadata.uid;

    if (uid) {
      await db.collection("users").doc(uid).set(
        {
          plan: "free",
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    }
  }

  res.json({ received: true });
}
