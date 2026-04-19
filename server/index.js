const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');
const { iniciarBanco, buscarRoms, deletarRom, estatisticas } = require('./database');
const { escanearPasta, verificarIntegridade } = require('./scanner');

const app  = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/roms', (req, res) => {
    const filtros = {
        nome:       req.query.nome       || '',
        plataforma: req.query.plataforma || '',
        regiao:     req.query.regiao     || '',
    };
    const roms = buscarRoms(filtros);
    res.json({ sucesso: true, total: roms.length, roms });
});

// ✅ Agora recebe o caminho do frontend
app.post('/api/escanear', async (req, res) => {
    const { caminho } = req.body;

    if (!caminho) {
        return res.json({ sucesso: false, mensagem: 'Nenhuma pasta informada' });
    }
    if (!fs.existsSync(caminho)) {
        return res.json({ sucesso: false, mensagem: 'Pasta não encontrada no sistema' });
    }

    console.log(`\n📁 Escaneando: ${caminho}\n`);
    const resultado = await escanearPasta(caminho);
    res.json({ sucesso: true, ...resultado });
});

app.get('/api/verificar', async (req, res) => {
    const resultado = await verificarIntegridade();
    const resumo = {
        ok:             resultado.filter(r => r.status === 'ok').length,
        corrompidas:    resultado.filter(r => r.status === 'corrompida').length,
        naoEncontradas: resultado.filter(r => r.status === 'nao_encontrada').length,
    };
    res.json({ sucesso: true, resumo, detalhes: resultado });
});

app.delete('/api/roms/:id', (req, res) => {
    deletarRom(Number(req.params.id));
    res.json({ sucesso: true, mensagem: 'ROM removida' });
});

app.get('/api/stats', (req, res) => {
    const stats = estatisticas();
    res.json({ sucesso: true, ...stats });
});

// Inicia o banco e depois sobe o servidor
iniciarBanco().then(() => {
    app.listen(PORT, () => {
        console.log(`\n🎮 ROM Manager rodando em http://localhost:${PORT}\n`);
    });
});