const express = require('express');
const dotenv = require('dotenv');
const multer = require('multer');
const sharp = require('sharp');

dotenv.config();

const app = express();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
let imageMarkCount = 0;
let requestTimes = []; // Array para almacenar las horas de las peticiones

const processImageWithWatermark = async (imageBuffer, watermarkText) => {
    try {
        const image = sharp(imageBuffer);
        const metadata = await image.metadata();
        const imageWidth = metadata.width;
        const imageHeight = metadata.height;

        const margin = 20;

        const watermarkSVG = `
            <svg width="${imageWidth}" height="${imageHeight}">
                <text x="${imageWidth - margin}" y="${imageHeight - margin}" font-size="50" fill="green" text-anchor="end" alignment-baseline="baseline">${watermarkText}</text>
            </svg>`;

        return await image
            .composite([{
                input: Buffer.from(watermarkSVG),
                blend: 'over'
            }])
            .toBuffer();
    } catch (error) {
        throw new Error('Error procesando la imagen: ' + error.message);
    }
};

app.post('/marcar', upload.single('image'), async (req, res) => {
    try {
        const { watermark } = req.body;

        if (!req.file) {
            return res.status(400).send('No se ha subido ninguna imagen');
        }

        if (!watermark) {
            return res.status(400).send('No se ha proporcionado ningún texto para la marca de agua');
        }

        const processedImage = await processImageWithWatermark(req.file.buffer, watermark);
        
        imageMarkCount++;
        const requestTime = new Date().toLocaleString();
        requestTimes.push(requestTime); 
        console.log(`Imágenes marcadas hasta ahora: ${imageMarkCount} - Hora: ${requestTime}`);

        res.type('image/png').send(processedImage);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error procesando la imagen');
    }
});

app.get('/healthcheck', (req, res) => {
    const payload = {
        uptime: `${process.uptime().toFixed(2)} seconds`,
        memoryUsage: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
        nodeVersion: process.version,
        platform: process.platform,
        imageMarkCount: imageMarkCount, 
        requestTimes: requestTimes 
    };
    try {
        const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
        res.status(200).json({
            status: 'Activo',
            method: req.method,
            url: url,
            date: new Date().toISOString(),
            payload: payload
        });
    } catch (error) {
        res.status(500).json({
            status: 'Inactivo',
            error: error.message,
            date: new Date().toISOString(),
            payload: payload
        });
    }
});

const port = process.env.MICROSERVICE_PORT;

app.listen(port, async () => { 
    console.log(`Microservice escuchando en el puerto ${port}`);
});
