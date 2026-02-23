const express = require('express');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const serviceAccountAuth = new JWT({
  email: 'rotacion-dias-libres@biometrico01.iam.gserviceaccount.com',
  key: require('./credentials.json').private_key, // Verifica que el archivo exista
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const SPREADSHEET_ID = '19i5pwrIx8RX0P2OkE1qY2o5igKvvv2hxUuvb9jM_8LE';

app.get('/api/empleados', async (req, res) => {
  try {
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Empleados'];
    const rows = await sheet.getRows();

    const empleados = rows.map(row => ({
      nombre: row.get('nombre') || 'SIN NOMBRE',
      cedula: row.get('cedula') || 'S/C',
      razonSocial: row.get('Razones sociales') || 'N/A',
      region: row.get('Region') || 'CENTRO' // Captura columna I
    }));
    res.json(empleados);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001, () => console.log('🚀 Servidor Backend en puerto 3001'));