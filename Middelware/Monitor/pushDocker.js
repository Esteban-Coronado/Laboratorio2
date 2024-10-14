const { Client } = require('ssh2');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

const conn = new Client();
const host = process.env.HOST; 
const username = "william"; 
const password = process.env.PASSWORD;

const discoveryServerUrl = process.env.SERVER_REGISTRY_URL; 

const registerInstance = async (host, port) => { 
    try {
        console.log(`Registrando instancia en ${discoveryServerUrl} con host: ${host} y puerto: ${port}`);
        const response = await axios.post(`${discoveryServerUrl}/register`, {
            host: host, 
            port: port,
        });
        console.log('Registro exitoso:', response.data);
    } catch (error) {
        console.error('Error al registrar la instancia:', error.response ? error.response.data : error.message);
    }
};

const getRandomPort = (min, max, usedPorts) => {
    let port;
    do {
        port = Math.floor(Math.random() * (max - min + 1)) + min;
    } while (usedPorts.includes(port));
    usedPorts.push(port);
    return port;
};

const usedPorts = [];

conn.on('ready', () => {
    console.log('Cliente SSH conectado');

    const randomPort = getRandomPort(5000, 6000, usedPorts);
    const dockerCommand = `docker run -d -p ${randomPort}:3000 microservice`; 

    console.log(`Ejecutando comando Docker: ${dockerCommand}`);

    conn.exec(dockerCommand, (err, stream) => {
        if (err) throw err;
        stream.on('close', async (code, signal) => {

            console.log(`Comando finalizado con código: ${code}, señal: ${signal}`);
            await registerInstance(host, randomPort); 
            conn.end();
            
        }).on('data', (data) => {
            console.log(`STDOUT: ${data}`);
        }).stderr.on('data', (data) => {
            console.error(`STDERR: ${data}`);
        });
    });
}).on('error', (err) => {
    console.error(`Error de conexión: ${err.message}`);
}).on('debug', (debug) => {
    console.log(`DEPURACIÓN: ${debug}`);
}).connect({
    host: host,
    port: 22,
    username: username,
    password: password,
});
