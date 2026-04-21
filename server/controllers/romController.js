const fs = require('fs');
const romModel = require('../models/romModel');
const { escanearPasta, verificarIntegridade } = require('../services/scanner');
const { buscarMetadados } = require('../services/metadata');

function listarRoms(req, res) {
    const filtros = {
        nome: req.query.nome || '',
        plataforma: req.query.plataforma || '',
        regiao: req.query.regiao || '',
    };
    const roms = romModel.buscarRoms(filtros);
    res.json({ sucesso: true, total: roms.length, roms });
}

async function escanear(req, res) {
    const { caminho } = req.body;

    if (!caminho) {
        return res.json({ sucesso: false, mensagem: 'Nenhuma pasta informada' });
    }
    if (!fs.existsSync(caminho)) {
        return res.json({ sucesso: false, mensagem: 'Pasta não encontrada' });
    }

    console.log(`\n📁 Escaneando: ${caminho}\n`);
    const resultado = await escanearPasta(caminho);
    res.json({ sucesso: true, ...resultado });
}

async function verificar(req, res) {
    const resultado = await verificarIntegridade();
    const resumo = {
        ok:             resultado.filter(r => r.status === 'ok').length,
        corrompidas:    resultado.filter(r => r.status === 'corrompida').length,
        naoEncontradas: resultado.filter(r => r.status === 'nao_encontrada').length,
    };
    res.json({ sucesso: true, resumo, detalhes: resultado });
}

function deletar(req, res) {
    romModel.deletarRom(Number(req.params.id));
    res.json({ sucesso: true, mensagem: 'ROM removida' });
}

async function atualizarMetadados(req, res) {
    const { nome, plataforma } = req.body;
    const meta = await buscarMetadados(nome, plataforma || '');

    if (!meta) {
        return res.json({ sucesso: false, mensagem: 'Metadados não encontrados' });
    }

    romModel.atualizarMetadados(Number(req.params.id), meta);
    res.json({ sucesso: true, ...meta });
}

function atualizarCapa(req, res) {
    const { capa } = req.body;

    if (!capa) {
        return res.json({ sucesso: false, mensagem: 'URL da capa não informada' });
    }

    try {
        new URL(capa);
    } catch {
        return res.json({ sucesso: false, mensagem: 'URL inválida' });
    }

    romModel.atualizarCapa(Number(req.params.id), capa);
    res.json({ sucesso: true, mensagem: 'Capa atualizada!' });
}

function estatisticas(req, res) {
    const stats = romModel.estatisticas();
    res.json({ sucesso: true, ...stats });
}

module.exports = { listarRoms, escanear, verificar, deletar, atualizarMetadados, atualizarCapa, estatisticas };