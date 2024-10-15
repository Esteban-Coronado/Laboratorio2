const express = require('express');
const cors = require('cors');
const axios = require('axios');
const WebSocket = require('ws');
const multer = require('multer');
require('dotenv').config();
const FormData = require('form-data');

const app = express();
const port = process.env.LOADBALANCER_PORT || 4000;
const discoveryServerUrl = process.env.SERVER_REGISTRY_URL;
let instances = [];
let currentIndex = 0;

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

const fetchInstances = async () => {
  try {
    const response = await axios.get(`${discoveryServerUrl}/instances`);
    instances = response.data.map(instance => ({
      host: instance.host,
      port: instance.port
    }));
    console.log('Instancias cargadas:', instances);
  } catch (error) {
    console.error('Error al obtener las instancias:', error.message);
  }
};

const getNextInstance = () => {
  if (instances.length === 0) {
    return null;
  }
  const instance = instances[currentIndex];
  currentIndex = (currentIndex + 1) % instances.length;
  return instance;
};

const sendToInstance = async (formData, instance) => {
  try {
    const response = await axios.post(
      `http://${instance.host}:${instance.port}/marcar`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Content-Length': formData.getLengthSync()
        },
        responseType: 'arraybuffer'
      }
    );
    return response;
  } catch (error) {
    throw new Error(`Instancia en puerto ${instance.port} no está funcionando`);
  }
};

app.post('/enviar-marcar', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No se ha subido ninguna imagen');
  }

  const watermark = req.body.watermark;

  if (!watermark) {
    return res.status(400).send('No se ha proporcionado ningún texto para la marca de agua');
  }

  const formData = new FormData();
  formData.append('image', req.file.buffer, req.file.originalname);
  formData.append('watermark', watermark);

  let instance = getNextInstance();
  let attempts = 0;

  while (attempts < instances.length) {
    try {
      const response = await sendToInstance(formData, instance);
      res.set('Content-Type', 'image/png');
      return res.send(Buffer.from(response.data));
    } catch (error) {
      console.error(error.message);
      attempts++;
      instance = getNextInstance();
      if (attempts >= instances.length) {
        return res.status(503).send('No hay instancias funcionando');
      }
    }
  }
});

const connectWebSocket = () => {
  const ws = new WebSocket(discoveryServerUrl.replace('http://', 'ws://'));

  ws.on('open', () => {
    console.log('Conectado al ServerRegistry vía WebSocket');
  });

  ws.on('message', (data) => {
    const parsedData = JSON.parse(data);

    if (Array.isArray(parsedData.data)) {
      instances = parsedData.data.map(instance => ({
        host: instance.host,
        port: instance.port
      }));
    } else if (typeof parsedData.data === 'object') {
      const newInstance = {
        host: parsedData.data.host,
        port: parsedData.data.port
      };

      if (!instances.some(instance => instance.host === newInstance.host && instance.port === newInstance.port)) {
        instances.push(newInstance);
      }
    }
    console.log('Instancias actualizadas:', instances);
  });

  ws.on('close', () => {
    console.log('Conexión WebSocket cerrada, intentando reconectar...');
    setTimeout(connectWebSocket, 3000);
  });

  ws.on('error', (error) => {
    console.error('Error en WebSocket:', error.message);
  });
};

(async () => {
  await fetchInstances();
  connectWebSocket(); 

  app.listen(port, () => {
    console.log(`Load Balancer escuchando en el puerto ${port}`);
  });
})();
