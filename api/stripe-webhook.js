import Stripe from "stripe";
import admin from "firebase-admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Firebase Admin (uma única vez)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    )
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Evento de pagamento concluído
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const uid = session.metadata.uid;
    const plan =
      session.amount_total >= 5000 ? "pro" : "free"; // ajuste se quiser

    if (uid) {
      await db.collection("users").doc(uid).set(
        {
          plan,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    }
  }

  res.json({ received: true });
}
