require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const axios = require('axios');

const app = express();
app.use(express.json());

const instances = [];
const activeInstances = [];
const failedInstances = [];

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const axiosInstance = axios.create({
  timeout: 3000,
});

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

  const newInstance = { host, port };
  instances.push(newInstance);
  console.log(`Instancia registrada: ${host}:${port}`);

  notifyClients(newInstance);

  res.status(200).json({ message: 'Instancia registrada', instances });
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

app.get('/instances', (req, res) => {
  res.status(200).json(instances);
});

app.get('/checkInstances', async (req, res) => {
  const healthStatuses = await Promise.all(instances.map(checkInstanceHealth));

  activeInstances.length = 0;
  failedInstances.length = 0;

  healthStatuses.forEach(status => {
    if (status.status === 'Activo') {
      activeInstances.push({ host: status.host, port: status.port });
    } else {
      failedInstances.push({ host: status.host, port: status.port, error: status.error });
    }
  });

  res.status(200).json(healthStatuses);
});

app.get('/logs', async (req, res) => {
  const logPromises = activeInstances.map(async (instance) => {
    const { host, port } = instance;
    try {
      const response = await axiosInstance.get(`http://${host}:${port}/healthcheck`);
      return {
        host,
        port,
        logs: response.data
      };
    } catch (error) {
      console.error(`Error al obtener logs de ${host}:${port} - ${error.message}`);
      return {
        host,
        port,
        logs: null,
        error: `No se puede conectar a ${host}:${port} - ${error.message}`
      };
    }
  });

  const results = await Promise.allSettled(logPromises);
  const allLogs = results.map((result, index) => {
    const instance = activeInstances[index];
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        host: instance.host,
        port: instance.port,
        logs: null,
        error: result.reason.message
      };
    }
  });

  res.status(200).json(allLogs);
});

const port = process.env.DISCOVERY_SERVER_PORT || 6000;
server.listen(port, () => {
  console.log(`ServerRegistry corriendo en el puerto ${port}`);
});