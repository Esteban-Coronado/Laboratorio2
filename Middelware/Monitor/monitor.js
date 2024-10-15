const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const socketIo = require('socket.io');

// Configuración del servidor Express
const app = express();
const server = http.createServer(app);
const io = socketIo(server); // Inicializamos Socket.IO

const instances = [];  // Estado de las instancias
let logs = [];         // Almacenamos los logs de las peticiones

require('dotenv').config();

// Middleware para procesar datos JSON en las solicitudes POST
app.use(express.json());

// Función para reconectar el WebSocket
const connectWebSocket = () => {
  const serverRegistryUrl = process.env.SERVER_REGISTRY_URL.replace('http://', 'ws://');
  const ws = new WebSocket(serverRegistryUrl);

  // Cuando el WebSocket recibe un mensaje del ServerRegistry, actualiza las instancias
  ws.on('message', (data) => {
    const parsedData = JSON.parse(data);
    instances.length = 0; // Limpiamos las instancias previas
    instances.push(...parsedData.data); // Actualizamos con las nuevas instancias

    // Enviamos la actualización de instancias a todos los clientes conectados
    io.emit('instances', instances);
  });

  // Cuando el WebSocket se cierra, reconecta automáticamente
  ws.on('close', () => {
    console.log('Conexión WebSocket cerrada, intentando reconectar...');
    setTimeout(connectWebSocket, 3000); // Intentar reconectar en 3 segundos
  });

  ws.on('error', (error) => {
    console.error('Error en WebSocket:', error.message);
  });
};

// Iniciar la conexión WebSocket
connectWebSocket();

// Función para registrar los logs de peticiones
const addLog = (log) => {
  logs.push(log);
  if (logs.length > 100) logs.shift(); // Limita el número de logs a 100
  io.emit('logs', logs); // Emitimos los logs actualizados a los clientes
};

// Escuchar eventos del LoadBalancer para monitorear las peticiones
app.post('/log', (req, res) => {
  const { instance, endpoint, status } = req.body;

  if (!instance || !endpoint || !status) {
    return res.status(400).send('Faltan datos para el log');
  }

  const logEntry = {
    timestamp: new Date(),
    instance,
    endpoint,
    status
  };

  addLog(logEntry); 
  res.status(200).send('Log registrado');
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/monitor.html');
});

io.on('connection', (socket) => {
  console.log('Nuevo cliente conectado');
  
  socket.emit('instances', instances);
  socket.emit('logs', logs);

  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
  });
});


const port = process.env.MONITOR_PORT || 5000;
server.listen(port, () => {
  console.log(`Monitor escuchando en el puerto ${port}`);
});