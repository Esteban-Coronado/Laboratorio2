const express = require('express');
const cors = require('cors');
const axios = require('axios');
const WebSocket = require('ws');
const multer = require('multer');
const { spawn } = require('child_process');
require('dotenv').config();
const FormData = require('form-data');

const app = express();
const port = process.env.LOADBALANCER_PORT || 4000;
const discoveryServerUrl = process.env.SERVER_REGISTRY_URL;
let instances = [];
let currentIndex = 0;
let fallenInstances = []; 

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
  const availableInstances = instances.filter(
    instance => !fallenInstances.some(
      fallen => fallen.host === instance.host && fallen.port === instance.port
    )
  );

  if (availableInstances.length === 0) {
    return null;
  }

  const instance = availableInstances[currentIndex];
  currentIndex = (currentIndex + 1) % availableInstances.length;
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
<<<<<<< HEAD
    throw new Error(`Instancia en puerto ${instance.port} no está funcionando`);
=======
    console.error(`Instancia en puerto ${instance.port} falló, agregando a lista de caídas`);
    fallenInstances.push(instance);

    const dockerProcess = spawn('node', ['pushDocker.js']);
    
    dockerProcess.stdout.on('data', (data) => {
      console.log(`STDOUT: ${data}`);
    });
    
    dockerProcess.stderr.on('data', (data) => {
      console.error(`STDERR: ${data}`);
    });

    dockerProcess.on('close', (code) => {
      console.log(`pushDocker.js finalizado con código: ${code}`);
    });

    throw new Error(`Instancia en puerto ${instance.port} no está funcionando`);
  }
};

const healthCheckFallenInstances = async () => {
  const healthyInstances = [];

  for (const instance of fallenInstances) {
    try {
      await axios.get(`http://${instance.host}:${instance.port}/healthcheck`);
      console.log(`Instancia en puerto ${instance.port} está funcionando de nuevo`);
      healthyInstances.push(instance);
    } catch (error) {
      console.log(`Instancia en puerto ${instance.port} sigue caída`);
    }
>>>>>>> origin/NicolasDev
  }
};

<<<<<<< HEAD
=======
  fallenInstances = fallenInstances.filter(
    instance => !healthyInstances.some(
      healthy => healthy.host === instance.host && healthy.port === instance.port
    )
  );
};

setInterval(healthCheckFallenInstances, 5000);

>>>>>>> origin/NicolasDev
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

<<<<<<< HEAD
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
=======
  if (instances.length === fallenInstances.length) {
    return res.status(503).send('No hay instancias disponibles, todas las instancias están caídas');
>>>>>>> origin/NicolasDev
  }

  let instance = getNextInstance();

  while (instance) {
    try {
      const response = await sendToInstance(formData, instance);
      res.set('Content-Type', 'image/png');
      return res.send(Buffer.from(response.data));
    } catch (error) {
      console.error(error.message);
      instance = getNextInstance();
    }
  }

  return res.status(503).send('No hay instancias disponibles');
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

<<<<<<< HEAD
      if (!instances.some(instance => instance.host === newInstance.host && instance.port === newInstance.port)) {
=======
      if (!instances.some(instance => instance.host === newInstance.host && newInstance.port === instance.port)) {
>>>>>>> origin/NicolasDev
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