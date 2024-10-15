const serverRegistryUrl = 'http://192.168.137.243:6000';
const instanceList = document.getElementById('instanceList');
const logs = document.getElementById('logs');
const ws = new WebSocket('ws://192.168.137.243:6000');

ws.onmessage = (event) => {
    const { data } = JSON.parse(event.data);
    updateInstanceList(data);
};

const updateInstanceList = (instances) => {
    instanceList.innerHTML = '';
    instances.forEach(instance => {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.textContent = `${instance.host}:${instance.port}`;
        instanceList.appendChild(li);
    });
};

document.getElementById('launchInstance').addEventListener('click', () => {
    const host = prompt('Ingrese el host de la nueva instancia:');
    const port = prompt('Ingrese el puerto de la nueva instancia:');

    if (host && port) {
        fetch(`${serverRegistryUrl}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ host, port }),
        })
        .then(response => response.json())
        .then(data => {
            logs.innerHTML += `<div>Instancia lanzada: ${host}:${port}</div>`;
        })
        .catch(error => {
            logs.innerHTML += `<div class="text-danger">Error al lanzar instancia: ${error.message}</div>`;
        });
    }
});

document.getElementById('deleteInstance').addEventListener('click', () => {
    const host = prompt('Ingrese el host de la instancia a borrar:');
    const port = prompt('Ingrese el puerto de la instancia a borrar:');

    // Implementar la lógica para borrar la instancia aquí
    // Esto depende de que tu API tenga un endpoint para borrar instancias.

    if (host && port) {
        logs.innerHTML += `<div>Instancia borrada: ${host}:${port}</div>`;
    }
});

// Cargar las instancias al iniciar
fetch(`${serverRegistryUrl}/instances`)
    .then(response => response.json())
    .then(data => {
        updateInstanceList(data);
    })
    .catch(error => {
        logs.innerHTML += `<div class="text-danger">Error al cargar instancias: ${error.message}</div>`;
    });
