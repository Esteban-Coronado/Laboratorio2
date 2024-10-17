require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const axios = require('axios');

const app = express();
app.use(express.json());

const instances = [];

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('Nuevo cliente conectado al WebSocket');
  ws.send(JSON.stringify({ data: instances }));
});

const notifyClients = (instance) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ data: instance }));
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

  res.status(200).json({ message: 'Instancia registrada', instances });
});

app.get('/instances', (req, res) => {
  res.status(200).json(instances);
});

app.get('/logs', async (req, res) => {
  const allLogs = [];

  for (const instance of instances) {
    const { host, port } = instance;

    try {
      const response = await axios.get(`http://${host}:${port}/healthcheck`);
      allLogs.push({
        host,
        port,
        logs: response.data // Guarda los logs de esta instancia
      });
    } catch (error) {
      console.error(`Error al obtener logs de ${host}:${port} - ${error.message}`);
      allLogs.push({
        host,
        port,
        logs: null,
        error: error.message
      });
    }
  }
  res.status(200).json(allLogs);
});

const checkInstanceHealth = async (instance) => {
  const { host, port } = instance;
  try {
    const response = await axios.get(`http://${host}:${port}/healthcheck`);
    return { host, port, status: 'Activo' };
  } catch (error) {
    return { host, port, status: 'Inactivo', error: error.message };
  }
};

app.get('/checkInstances', async (req, res) => {
  const healthStatuses = await Promise.all(instances.map(checkInstanceHealth));
  res.status(200).json(healthStatuses);
});

const port = process.env.DISCOVERY_SERVER_PORT || 6000;
server.listen(port, () => {
  console.log(`ServerRegistry corriendo en el puerto ${port}`);
});