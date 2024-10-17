const express = require('express');
const path = require('path');
const WebSocket = require('ws');
const http = require('http');
require('dotenv').config();
const axios = require('axios');

const PushDocker = require('./pushDocker');

// Configuración del servidor Express
const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server); // Inicializamos Socket.IO

const MONITOR_PORT = process.env.MONITOR_PORT || 7000;
const SERVER_REGISTRY_URL = process.env.SERVER_REGISTRY_URL || 'http://localhost:6000';

let logs = [];
let instanceData = [];


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'monitor.html'));
});

// Configura el servidor Socket.IO
io.on('connection', (socket) => {
    console.log('Nuevo cliente conectado.');

    // Envía un mensaje al cliente cuando se conecta
    socket.emit('message', 'Bienvenido al servidor Socket.IO!');

    // Maneja la desconexión del cliente
    socket.on('disconnect', () => {
        console.log('Cliente desconectado.');
    });
});

// Endpoint para obtener logs
const fetchLogs = async () => {
    try {
        const response = await axios.get(`${SERVER_REGISTRY_URL}/logs`);
        const data = response.data;

        logs = []; // Limpiar el array para evitar duplicados

        data.forEach(instance => {
            logs.push({
                host: instance.host,
                port: instance.port,
                logs: instance.logs || 'No se pudieron obtener los logs',
                error: instance.error || null
            });
        });

        console.log(logs); // Muestra los logs en la consola

        // Emitir logs a los clientes conectados
        io.emit('updateLogs', logs);
    } catch (error) {
        console.error('Error al recuperar los logs:', error.message);
    }
};

const fetchInstanceData = async () => {
    try {
        const response = await axios.get(`${SERVER_REGISTRY_URL}/checkInstances`);
        instanceData = response.data;

        // Emitir los datos de las instancias a los clientes conectados
        io.emit('updateInstances', instanceData);
    } catch (error) {
        console.error('Error al recuperar el estado de las instancias:', error.message);
    }
};

// Endpoint para lanzar una nueva instancia
app.post('/launch-instance', async (req, res) => {
    try {
        const randomPort = PushDocker.getRandomPort(5000, 6000, []); // Asegúrate de que la función esté disponible
        console.log(`Lanzando nueva instancia en el puerto: ${randomPort}`);

        // Llama a PushDocker para crear la instancia
        await PushDocker.conn.on('ready', () => {
            PushDocker.conn.exec(`docker run -d -p ${randomPort}:3000 microservice`, (err, stream) => {
                if (err) {
                    return res.status(500).send(`Error al ejecutar el comando Docker: ${err.message}`);
                }

                stream.on('close', async (code, signal) => {
                    console.log(`Comando Docker ejecutado con código: ${code} y señal: ${signal}`);
                    // Registrar la instancia
                    await PushDocker.registerInstance('localhost', randomPort);
                    res.status(200).send('Instancia lanzada con éxito');
                    PushDocker.conn.end();  // Terminar conexión SSH
                });
            });
        }).connect({
            host: PushDocker.host,
            port: 22,
            username: PushDocker.username,
            password: PushDocker.password,
        });
    } catch (error) {
        console.error(`Error al lanzar la instancia: ${error.message}`);
        res.status(500).send(`Error al lanzar la instancia: ${error.message}`);
    }
});


// Inicia el servidor en el puerto definido
server.listen(MONITOR_PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${MONITOR_PORT}`);
    fetchLogs(); // Llama a fetchLogs al iniciar
    setInterval(fetchLogs, 5000);
    setInterval(fetchInstanceData, 1000);
});






// // Lanzar una nueva instancia
// async function launchInstance() {
//     try {
//         const response = await fetch(`${SERVER_REGISTRY_URL}/launch-instance`, { method: 'POST' });
//         if (response.ok) {
//             console.log('Nueva instancia lanzada');
//             // Si se quiere obtener el healthcheck inmediatamente, se puede agregar aquí
//             // await fetchHealthcheck(host, randomPort);
//         } else {
//             console.error('Error al lanzar instancia:', response.statusText);
//         }
//     } catch (error) {
//         console.error('Error al lanzar instancia:', error);
//     }
// }