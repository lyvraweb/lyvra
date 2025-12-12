const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');

// Initialize Firebase admin with credentials (set via env or service account)
if (!admin.apps.length) {
  try {
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  } catch (e) {
    console.log('Firebase admin init error (in dev), continuing: ', e.message);
  }
}

module.exports = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody || req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const uid = session.metadata && session.metadata.uid;
    if(uid) {
      // update Firestore user plan
      const db = admin.firestore();
      const userRef = db.collection('users').doc(uid);
      await userRef.set({ plan: session.metadata.plan || 'pro', subscription: session.subscription }, { merge: true });
    }
  }
  res.json({ received: true });
};