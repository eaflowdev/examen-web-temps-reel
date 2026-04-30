const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Ensemble des clients connectés
const clients = new Set();

// Historique en mémoire (max 50 notifications)
const history = [];
const MAX_HISTORY = 50;

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`Client connecté. Total : ${clients.size}`);

  // Envoyer l'historique au nouveau client
  if (history.length > 0) {
    ws.send(JSON.stringify({ type: 'history', notifications: history }));
  }

  ws.on('message', (data) => {
    let parsed;

    try {
      parsed = JSON.parse(data);
    } catch (err) {
      console.error('Message JSON invalide :', data.toString());
      return;
    }

    // Valider la structure attendue
    if (!parsed.type || !parsed.message) {
      console.warn('Message ignoré (champs manquants) :', parsed);
      return;
    }

    console.log('Message reçu :', parsed);

    // Stocker dans l'historique
    history.push(parsed);
    if (history.length > MAX_HISTORY) {
      history.shift();
    }

    const payload = JSON.stringify(parsed);
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`Client déconnecté. Total : ${clients.size}`);
  });

  ws.on('error', (err) => {
    console.error('Erreur WebSocket :', err.message);
    clients.delete(ws);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
