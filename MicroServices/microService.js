const express = require('express');
const dotenv = require('dotenv');
const multer = require('multer');
const sharp = require('sharp');

dotenv.config();

const app = express();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


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

        res.type('image/png').send(processedImage);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error procesando la imagen');
    }
});

const port = process.env.MICROSERVICE_PORT;

app.listen(port, async () => { 
    console.log(`Microservice escuchando en el puerto ${port}`);
});
