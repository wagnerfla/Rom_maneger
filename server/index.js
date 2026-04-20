const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');
const { iniciarBanco, buscarRoms, deletarRom, estatisticas, atualizarMetadados, atualizarCapa } = require('./database');
const { escanearPasta, verificarIntegridade } = require('./scanner');
const { buscarMetadados } = require('./metadata');

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

app.post('/api/roms/:id/metadados', async (req, res) => {
    const { nome, plataforma } = req.body;
    const meta = await buscarMetadados(nome, plataforma || '');

    if (!meta) {
        return res.json({ sucesso: false, mensagem: 'Metadados não encontrados' });
    };

    atualizarMetadados(Number(req.params.id), meta);
    res.json({ sucesso: true, ...meta});
});

app.patch('/api/roms/:id/capa', (req, res) => {
    const { capa } = req.body;

    if (!capa) {
        return res.json({ sucesso: false, mensagem: 'URL da capa não informada' });
    }

    try {
        new URL(capa);
    } catch {
        return res.json({ sucesso: false, mensagem: 'URL invalida' });
    }

    atualizarCapa(Number(req.params.id), capa);
    res.json({ sucesso: true, mensagem: 'Capa atualizada' });
});


iniciarBanco().then(() => {
    app.listen(PORT, () => {
        console.log(`\n🎮 ROM Manager rodando em http://localhost:${PORT}\n`);
    });
});