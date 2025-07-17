// server.js
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();

// Configure CORS to allow requests from your Firebase Hosting URL
const allowedOrigins = ['https://oassisjob.web.app']; // Replace with your Firebase Hosting URL
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Handle preflight OPTIONS requests explicitly
app.options('*', cors());

app.use(express.json());

app.post('/initialize-payment', async (req, res) => {
  const chapaKey = process.env.CHAPA_TEST_KEY;
  console.log('Chapa API Key:', chapaKey ? 'Set' : 'Missing');
  console.log('Request Origin:', req.headers.origin);
  console.log('Request Body:', req.body);

  try {
    const response = await fetch('https://api.chapa.co/v1/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${chapaKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify(req.body)
    });

    console.log('Chapa API Response Status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Chapa API error:', { status: response.status, errorText });
      return res.status(response.status).json({ error: errorText });
    }

    const result = await response.json();
    console.log('Chapa API response:', result);
    res.status(200).json(result);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/verify-payment', async (req, res) => {
  const { tx_ref } = req.query;
  console.log('Verifying tx_ref:', tx_ref);

  try {
    const response = await fetch(`https://api.chapa.co/v1/transaction/verify/${tx_ref}`, {
      headers: {
        'Authorization': `Bearer ${process.env.CHAPA_TEST_KEY}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Chapa verification error:', { status: response.status, errorText });
      return res.status(response.status).json({ error: errorText });
    }

    const result = await response.json();
    console.log('Chapa verification response:', result);
    res.status(200).json(result);
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Proxy server running on port', process.env.PORT || 3000);
});




// Verify Payment Endpoint (Webhook)
app.post('/verify-payment', async (req, res) => {
  const { tx_ref, status } = req.body;
  console.log('Verify Payment - Webhook Request Origin:', req.headers.origin);
  console.log('Verify Payment - Webhook Body:', req.body);

  // Validate request
  if (!tx_ref || !status) {
    console.error('Verify Payment - Error: Missing tx_ref or status in webhook');
    return res.status(400).json({ error: 'Missing tx_ref or status' });
  }

  const chapaKey = process.env.CHAPA_TEST_KEY;
  if (!chapaKey) {
    console.error('Verify Payment - Error: Missing CHAPA_TEST_KEY');
    return res.status(500).json({ error: 'Server configuration error: Missing API key' });
  }

  try {
    // Verify payment with Chapa
    const response = await fetch(`https://api.chapa.co/v1/transaction/verify/${tx_ref}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${chapaKey}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    console.log('Verify Payment - Chapa API Response Status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Verify Payment - Chapa API error:', { status: response.status, errorText });
      return res.status(response.status).json({ error: errorText });
    }

    const result = await response.json();
    console.log('Verify Payment - Chapa API response:', result);

    // Update Firestore
    const paymentRef = db.collection('payments');
    const query = paymentRef.where('tx_ref', '==', tx_ref);
    const snapshot = await query.get();

    if (snapshot.empty) {
      console.error('Verify Payment - Error: No payment record found for tx_ref:', tx_ref);
      return res.status(404).json({ error: 'Payment record not found' });
    }

    snapshot.forEach(async (doc) => {
      await doc.ref.update({
        status: result.status === 'success' ? 'success' : 'failed'
        //updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('Verify Payment - Firestore updated for tx_ref:', tx_ref, 'Status:', result.status);
    });

    // Respond to Chapa webhook
    res.status(200).json({
      status: 'success',
      message: 'Webhook processed successfully'
    });
  } catch (error) {
    console.error('Verify Payment - Server error:', error.message);
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
   
