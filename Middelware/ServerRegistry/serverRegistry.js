require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
app.use(express.json());

const instances = [];

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('Nuevo cliente conectado al WebSocket');
  ws.send(JSON.stringify({data: instances }));
});

const notifyClients = (instance) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({data: instance}));
    }
  });
};

app.post('/register', (req, res) => {
  const { host, port } = req.body; 
  
  if (!host || !port) {
    return res.status(400).send('Faltan campos host o Puerto');
  }

  /*const exists = instances.some(instance => instance.host === host && instance.port === port);
  if (exists) {
    return res.status(400).send('La instancia ya está registrada');
  }*/

  const newInstance = { host, port }; 
  instances.push(newInstance);
  console.log(`Instancia registrada: ${host}:${port}`); 
  
  notifyClients(newInstance);
  
  res.status(200).send('Instancia registrada');
});

app.get('/instances', (req, res) => {
  res.status(200).json(instances);
});

const port = process.env.DISCOVERY_SERVER_PORT || 6000;
server.listen(port, () => {
  console.log(`ServerRegistry corriendo en el puerto ${port}`);
});
