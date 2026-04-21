// server/index.js
require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const path      = require('path');
const { iniciarBanco } = require('./models/database');
const romRoutes = require('./routes/romRoutes');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/roms', romRoutes); 

iniciarBanco().then(() => {
    app.listen(PORT, () => {
        console.log(`\n🎮 ROM Manager rodando em http://localhost:${PORT}\n`);
    });
});