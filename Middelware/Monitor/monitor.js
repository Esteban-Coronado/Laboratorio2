const MONITOR_PORT = process.env.MONITOR_PORT || 7000;
const SERVER_REGISTRY_URL = process.env.SERVER_REGISTRY_URL || 'http://localhost:6000'; 

const ws = new WebSocket(`ws://localhost:${MONITOR_PORT}`); 

let instanceData = [];
let logs = []; 

// Conectar WebSocket
ws.onmessage = (event) => {
    const data = JSON.parse(event.data).data;
    instanceData = data; // Actualizar los datos de las instancias
    updateTable(); // Actualizar la tabla cuando haya nuevos datos
};

// Actualizar la tabla con las instancias
function updateTable() {
    const instanceTable = document.getElementById('instanceTable');
    instanceTable.innerHTML = ''; // Limpiar tabla antes de actualizar

    instanceData.forEach((instance) => {
        const row = instanceTable.insertRow();

        row.insertCell(0).innerText = instance.host;
        row.insertCell(1).innerText = instance.port;
        row.insertCell(2).innerText = 'Activo';

        // Agregar botones de eliminar instancia
        const deleteButton = document.createElement('button');
        deleteButton.classList.add('btn', 'btn-danger');
        deleteButton.innerText = 'Eliminar';
        deleteButton.onclick = () => deleteInstance(instance.host, instance.port);

        const actionCell = row.insertCell(3);
        actionCell.appendChild(deleteButton);
    });
}

// Eliminar una instancia
async function deleteInstance(host, port) {
    try {
        await fetch(`${SERVER_REGISTRY_URL}/unregister`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ host, port })
        });
        console.log(`Instancia eliminada: ${host}:${port}`);
        instanceData = instanceData.filter(instance => !(instance.host === host && instance.port === port));
        updateTable(); // Actualizar tabla después de eliminar
        await fetchHealthcheck(host, port); // Obtener logs después de eliminar
    } catch (error) {
        console.error('Error al eliminar instancia:', error);
    }
}

// Lanzar una nueva instancia
async function launchInstance() {
    try {
        const response = await fetch(`${SERVER_REGISTRY_URL}/launch-instance`, { method: 'POST' });
        if (response.ok) {
            console.log('Nueva instancia lanzada');
            // Si se quiere obtener el healthcheck inmediatamente, se puede agregar aquí
            // await fetchHealthcheck(host, randomPort);
        } else {
            console.error('Error al lanzar instancia:', response.statusText);
        }
    } catch (error) {
        console.error('Error al lanzar instancia:', error);
    }
}

// Obtener logs de la instancia
async function fetchHealthcheck(host, port) {
    try {
        const response = await fetch(`http://${host}:${port}/healthcheck`);
        const logData = await response.json();
        logs.push({
            timestamp: new Date().toISOString(),
            ...logData
        });
        updateLogsTable(); // Actualizar tabla de logs
    } catch (error) {
        console.error('Error al obtener logs de la instancia:', error);
    }
}

// Actualizar la tabla de logs
function updateLogsTable() {
    const logsTable = document.getElementById('logsTable');
    logsTable.innerHTML = ''; // Limpiar tabla antes de actualizar

    logs.forEach(log => {
        const row = logsTable.insertRow();
        row.insertCell(0).innerText = log.timestamp;
        row.insertCell(1).innerText = log.status;
        row.insertCell(2).innerText = log.method;
        row.insertCell(3).innerText = log.url;
        row.insertCell(4).innerText = log.date;
        row.insertCell(5).innerText = JSON.stringify(log.payload); 
    });
}


setInterval(updateTable, 5000);
