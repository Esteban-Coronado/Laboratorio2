require('dotenv').config();
const axios = require('axios');
const WebSocket = require('ws');
const Chart = require('chart.js/auto');

// Configuración de las variables de entorno
const discoveryServerUrl = process.env.SERVER_REGISTRY_URL || 'http://localhost:6000';

// Elementos HTML para mostrar las instancias, los logs y la gráfica
const instancesTable = document.getElementById('instancesTable');
const healthLogsTable = document.getElementById('healthLogsTable');
const statusChartElement = document.getElementById('statusChart').getContext('2d');
const ws = new WebSocket(`ws://${discoveryServerUrl.replace(/^http/, 'ws')}`);

// Variables para las instancias, los logs y la gráfica
let instances = [];
let healthLogs = [];
let chartData = {
  labels: [], // Horas de los health checks
  datasets: []
};

// Crear el gráfico de Chart.js
const statusChart = new Chart(statusChartElement, {
  type: 'line',
  data: chartData,
  options: {
    responsive: true,
    plugins: {
      legend: {
        display: true
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'minute',
          displayFormats: {
            minute: 'HH:mm'
          }
        }
      }
    }
  }
});

// Obtener las instancias registradas desde el servidor de registro
async function fetchInstances() {
  try {
    const response = await axios.get(`${discoveryServerUrl}/instances`);
    instances = response.data;
    updateInstancesTable();
    updateChartDatasets();
  } catch (error) {
    console.error('Error al obtener instancias:', error);
  }
}

// Actualizar la tabla de instancias
function updateInstancesTable() {
  instancesTable.innerHTML = ''; // Limpiar la tabla

  instances.forEach(instance => {
    const row = instancesTable.insertRow();
    const cellHost = row.insertCell(0);
    const cellPort = row.insertCell(1);

    cellHost.textContent = instance.host;
    cellPort.textContent = instance.port;

    // Realizar el health check para cada instancia
    performHealthCheck(instance);
  });
}

// Realizar un health check para cada instancia
async function performHealthCheck(instance) {
  const { host, port } = instance;
  try {
    const response = await axios.get(`http://${host}:${port}/healthcheck`);
    logHealthCheck(instance, response.data, true);  // Instancia activa
  } catch (error) {
    console.error(`Error en healthcheck para ${host}:${port}`, error);
    logHealthCheck(instance, { status: 'Inactivo', error: error.message }, false);  // Instancia inactiva
  }
}

// Registrar el resultado de un health check en la tabla de logs
function logHealthCheck(instance, data, isActive) {
  const row = healthLogsTable.insertRow();
  const cellTime = row.insertCell(0);
  const cellHost = row.insertCell(1);
  const cellPort = row.insertCell(2);
  const cellStatus = row.insertCell(3);
  const cellMethod = row.insertCell(4);
  const cellUrl = row.insertCell(5);
  const cellPayload = row.insertCell(6);

  const now = new Date().toLocaleString();
  cellTime.textContent = now;
  cellHost.textContent = instance.host;
  cellPort.textContent = instance.port;
  cellStatus.textContent = data.status || 'Inactivo';
  cellMethod.textContent = data.method || 'N/A';
  cellUrl.textContent = data.url || 'N/A';
  cellPayload.textContent = JSON.stringify(data.payload) || 'N/A';

  healthLogs.push({ instance, time: now, data });

  // Actualizar la gráfica con el nuevo estado de la instancia
  updateChart(instance, isActive);
}

// Actualizar los datasets de la gráfica al cargar nuevas instancias
function updateChartDatasets() {
  chartData.datasets = instances.map(instance => ({
    label: `${instance.host}:${instance.port}`,
    data: [],
    borderColor: randomColor(),
    fill: false,
    tension: 0.1
  }));
  statusChart.update();
}

// Actualizar la gráfica con el nuevo estado de una instancia
function updateChart(instance, isActive) {
  const dataset = chartData.datasets.find(d => d.label === `${instance.host}:${instance.port}`);
  if (dataset) {
    const now = new Date();
    dataset.data.push({
      x: now,
      y: isActive ? 1 : 0  // 1 para activo, 0 para inactivo
    });

    chartData.labels.push(now);
    statusChart.update();
  }
}

// Función para generar colores aleatorios para las líneas del gráfico
function randomColor() {
  const r = Math.floor(Math.random() * 255);
  const g = Math.floor(Math.random() * 255);
  const b = Math.floor(Math.random() * 255);
  return `rgb(${r},${g},${b})`;
}

// WebSocket: recibir nuevas instancias registradas en tiempo real
ws.onmessage = (message) => {
  const data = JSON.parse(message.data);
  if (data.data) {
    instances.push(data.data);
    updateInstancesTable();
    updateChartDatasets();
  }
};

// Obtener las instancias iniciales cuando la página cargue
window.onload = fetchInstances;
