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

  try {
    // ==============================
    // CHECKOUT FINALIZADO
    // ==============================
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const uid = session.metadata?.uid;

      if (!uid) return res.json({ received: true });

      await db.collection("users").doc(uid).set(
        {
          plan: "pro",
          stripeCustomerId: session.customer,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    }

    // ==============================
    // ASSINATURA CRIADA / ATUALIZADA
    // ==============================
    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated"
    ) {
      const sub = event.data.object;
      const uid = sub.metadata?.uid;
      const plan = sub.metadata?.plan || "pro";

      if (!uid) return res.json({ received: true });

      await db.collection("users").doc(uid).set(
        {
          plan,
          subscriptionStatus: sub.status,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    }

    // ==============================
    // ASSINATURA CANCELADA
    // ==============================
    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object;
      const uid = sub.metadata?.uid;

      if (!uid) return res.json({ received: true });

      await db.collection("users").doc(uid).set(
        {
          plan: "free",
          subscriptionStatus: "canceled",
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    }

    res.json({ received: true });

  } catch (err) {
    console.error("Webhook processing error:", err);
    res.status(500).send("Webhook handler failed");
  }
}
