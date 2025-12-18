import Stripe from "stripe";
import admin from "firebase-admin";

export const config = {
  api: {
    bodyParser: false
  }
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Firebase Admin (singleton)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    )
  });
}

const db = admin.firestore();

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  let event;
  const sig = req.headers["stripe-signature"];

  try {
    const rawBody = await getRawBody(req);

    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Stripe Webhook Error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ✅ Checkout concluído
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const uid = session.metadata?.uid;
    const plan = session.metadata?.plan;

    console.log("✅ WEBHOOK OK:", { uid, plan });

    if (uid && plan) {
      await db.collection("users").doc(uid).set(
        {
          plan,
          stripeCustomerId: session.customer,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    }
  }

  res.status(200).json({ received: true });
}

// Assinatura atualizada (downgrade ou cancelamento programado)
if (event.type === "customer.subscription.updated") {
  const sub = event.data.object;
  const uid = sub.metadata?.uid;

  if (uid && sub.cancel_at_period_end) {
    await db.collection("users").doc(uid).set(
      {
        plan: "free",
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );
  }
}

// Assinatura cancelada definitivamente
if (event.type === "customer.subscription.deleted") {
  const sub = event.data.object;
  const uid = sub.metadata?.uid;

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
