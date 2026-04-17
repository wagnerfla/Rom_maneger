const express = require('express');
const cors = require('cors');
const path = require('path');
const {buscarRoms, deletarRom, estatisticas} = require('./database');
const {escanearPasta, verificarIntegridade} = require('./scanner');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/api/roms', (req, res) => {
    const filtros = {
        nome: req.query.nome || '',
        plataforma: req.query.plataforma || '',
        regiao: req.query.regiao || '',
    };

    const roms = buscarRoms(filtros);
    res.json({sucesso: true, total: roms.length, roms});
});

app.post('/api/escanear', async (req, res) =>{
    const pasta = path.join(__dirname, '..','roms');

    console.log(`\n📁 escaneando: ${pasta}\n`);
    const resultado = await escanearPasta(pasta);

    res.json({ sucesso: true, ...resultado});
});

app.get('/api/verificar', async (req, res) => {
  const resultado = await verificarIntegridade();

  const resumo = {
    ok:            resultado.filter(r => r.status === 'ok').length,
    corrompidas:   resultado.filter(r => r.status === 'corrompida').length,
    naoEncontradas:resultado.filter(r => r.status === 'nao_encontrada').length,
  };

  res.json({ sucesso: true, resumo, detalhes: resultado });
});

app.delete('/api/roms/:id', (req, res) => {
  const { id } = req.params;
  deletarRom(Number(id));
  res.json({ sucesso: true, mensagem: `ROM ${id} removida do catálogo` });
});

app.get('/api/stats', (req, res) => {
  const stats = estatisticas();
  res.json({ sucesso: true, ...stats });
});

app.listen(PORT, () =>{
    console.log(`\n🎮 ROM Manager rodando em http://localhost:${PORT}\n`);
});