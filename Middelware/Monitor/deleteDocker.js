const { Client } = require('ssh2');
const dotenv = require('dotenv');

dotenv.config();

const conn = new Client();
const host = process.env.HOST; 
const username = "andress"; 
const password = process.env.PASSWORD;

conn.on('ready', () => {
    console.log('Cliente SSH conectado');
    const listContainersCommand = 'docker ps -q'; 

    conn.exec(listContainersCommand, (err, stream) => {
        if (err) throw err;
        
        let containerIds = '';

        stream.on('close', async (code, signal) => {
            console.log(`Comando de listado finalizado con código: ${code}, señal: ${signal}`);

            const containers = containerIds.trim().split('\n').filter(Boolean);
            if (containers.length === 0) {
                console.log('No hay contenedores en ejecución.');
                conn.end();
                return;
            }

            const randomIndex = Math.floor(Math.random() * containers.length);
            const randomContainerId = containers[randomIndex];

            const deleteCommand = `docker rm -f ${randomContainerId}`;
            console.log(`Ejecutando comando de eliminación: ${deleteCommand}`);

            conn.exec(deleteCommand, async (err, stream) => {
                if (err) throw err;

                stream.on('close', async (code, signal) => {
                    console.log(`Comando de eliminación finalizado con código: ${code}, señal: ${signal}`);
                    conn.end();
                }).on('data', (data) => {
                    console.log(`STDOUT: ${data}`);
                }).stderr.on('data', (data) => {
                    console.error(`STDERR: ${data}`);
                });
            });
        }).on('data', (data) => {
            containerIds += data;
        }).stderr.on('data', (data) => {
            console.error(`STDERR: ${data}`);
        });
    });
}).on('error', (err) => {
    console.error(`Error de conexión: ${err.message}`);
}).connect({
    host: host,
    port: 22,
    username: username,
    password: password,
});
