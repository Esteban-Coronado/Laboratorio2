const express = require('express');
const path = require('path');
const WebSocket = require('ws');
const http = require('http');
require('dotenv').config();
const axios = require('axios');
const PushDocker = require('./pushDocker');
const deleteDocker = require('./deleteDocker'); 


const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server); 

const MONITOR_PORT = process.env.MONITOR_PORT || 7000;
const SERVER_REGISTRY_URL = process.env.SERVER_REGISTRY_URL || 'http://localhost:6000';

let logs = [];
let instanceData = [];

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'monitor.html'));
});


io.on('connection', (socket) => {
    console.log('Nuevo cliente conectado.');

   
    socket.emit('message', 'Bienvenido al servidor Socket.IO!');

   
    socket.on('disconnect', () => {
        console.log('Cliente desconectado.');
    });
});


const fetchLogs = async () => {
    try {
        const response = await axios.get(`${SERVER_REGISTRY_URL}/logs`);
        const data = response.data;

        logs = []; 

        data.forEach(instance => {
            logs.push({
                host: instance.host,
                port: instance.port,
                logs: instance.logs || 'No se pudieron obtener los logs',
                error: instance.error || null
            });
        });

        console.log(logs); 

        
        io.emit('updateLogs', logs);
    } catch (error) {
        console.error('Error al recuperar los logs:', error.message);
    }
};


const fetchInstanceData = async () => {
    try {
        const response = await axios.get(`${SERVER_REGISTRY_URL}/checkInstances`);
        instanceData = response.data;

        
        io.emit('updateInstances', instanceData);
    } catch (error) {
        console.error('Error al recuperar el estado de las instancias:', error.message);
    }
};


app.post('/launch-instance', async (req, res) => {
    try {
        const randomPort = PushDocker.getRandomPort(5000, 6000, []);
        console.log(`Lanzando nueva instancia en el puerto: ${randomPort}`);

        
        await PushDocker.conn.on('ready', () => {
            PushDocker.conn.exec(`docker run -d -p ${randomPort}:3000 microservice`, (err, stream) => {
                if (err) {
                    return res.status(500).send(`Error al ejecutar el comando Docker: ${err.message}`);
                }

                stream.on('close', async (code, signal) => {
                    console.log(`Comando Docker ejecutado con código: ${code} y señal: ${signal}`);
                    await PushDocker.registerInstance('localhost', randomPort);
                    res.status(200).send('Instancia lanzada con éxito');
                    PushDocker.conn.end();  
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


app.post('/delete-instance', async (req, res) => {
    try {
        console.log('Iniciando la eliminación de una instancia...');

        deleteDocker.conn.on('ready', () => {
            
        }).connect({
            host: deleteDocker.host,
            port: 22,
            username: deleteDocker.username,
            password: deleteDocker.password,
        });
    } catch (error) {
        console.error(`Error al intentar borrar la instancia: ${error.message}`);
        res.status(500).send(`Error al intentar borrar la instancia: ${error.message}`);
    }
});



server.listen(MONITOR_PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${MONITOR_PORT}`);
    fetchLogs(); 
    setInterval(fetchLogs, 5000);
    setInterval(fetchInstanceData, 1000);
});
