const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors({ origin: 'https://myweb-app.web.app' }));
app.use(express.json());

app.post('/initialize-payment', async (req, res) => {
  try {
    const response = await fetch('https://api.chapa.co/v1/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer CHAPA_TEST_KEY', // Replace with your Chapa test key
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const result = await response.json();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Proxy server running');
});
