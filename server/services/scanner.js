// server/services/scanner.js
const fs       = require('fs');
const path     = require('path');
const crypto   = require('crypto');
const romModel = require('../models/romModel');
const { buscarMetadados } = require('./metadata');
const { validarRom }      = require('./validador');

const EXTENSOES = {
    '.gba': 'GBA',
    '.gb':  'GameBoy',
    '.gbc': 'GameBoy Color',
    '.nes': 'NES',
    '.smc': 'SNES',
    '.sfc': 'SNES',
    '.n64': 'N64',
    '.z64': 'N64',
    '.nds': 'Nintendo DS',
    '.3ds': '3DS',
    '.bin': 'PS1',
    '.cue': 'PS1',
    '.img': 'PS1',
    '.mdf': 'PS1',
    '.iso': 'PS2',
};

const TAMANHO_AMOSTRA = 4 * 1024 * 1024; // 4MB por amostra

async function calcularHash(caminho) {
    const tamanho = fs.statSync(caminho).size;

    // Arquivos pequenos — lê tudo
    if (tamanho <= TAMANHO_AMOSTRA * 3) {
        return new Promise((resolve, reject) => {
            const hash   = crypto.createHash('md5');
            const stream = fs.createReadStream(caminho, { highWaterMark: 65536 });

            stream.on('data',  bloco => hash.update(bloco));
            stream.on('end',   ()    => resolve(hash.digest('hex')));
            stream.on('error', err   => reject(err));
        });
    }

    // Arquivos grandes — lê início, meio e fim
    return new Promise((resolve, reject) => {
        try {
            const hash   = crypto.createHash('md5');
            const fd     = fs.openSync(caminho, 'r');
            const buffer = Buffer.alloc(TAMANHO_AMOSTRA);

            // Início
            fs.readSync(fd, buffer, 0, TAMANHO_AMOSTRA, 0);
            hash.update(buffer);

            // Meio
            const posicaoMeio = Math.floor(tamanho / 2) - Math.floor(TAMANHO_AMOSTRA / 2);
            fs.readSync(fd, buffer, 0, TAMANHO_AMOSTRA, posicaoMeio);
            hash.update(buffer);

            // Fim
            const posicaoFim = tamanho - TAMANHO_AMOSTRA;
            fs.readSync(fd, buffer, 0, TAMANHO_AMOSTRA, posicaoFim);
            hash.update(buffer);

            // Inclui o tamanho para evitar colisões
            hash.update(tamanho.toString());

            fs.closeSync(fd);
            resolve(hash.digest('hex'));

        } catch (err) {
            reject(err);
        }
    });
}

function extrairRegiao(nome) {
    const regioes = [
        { padrao: /\(USA\)/i,   regiao: 'USA'   },
        { padrao: /\(U\)/i,     regiao: 'USA'   },
        { padrao: /\(EUR\)/i,   regiao: 'EUR'   },
        { padrao: /\(E\)/i,     regiao: 'EUR'   },
        { padrao: /\(JPN\)/i,   regiao: 'JPN'   },
        { padrao: /\(J\)/i,     regiao: 'JPN'   },
        { padrao: /\(BRA\)/i,   regiao: 'BRA'   },
        { padrao: /\(World\)/i, regiao: 'World' },
    ];

    for (const { padrao, regiao } of regioes) {
        if (padrao.test(nome)) return regiao;
    }
    return 'Desconhecida';
}

function listarArquivos(pasta) {
    let arquivos = [];

    for (const item of fs.readdirSync(pasta)) {
        const caminho = path.join(pasta, item);
        const stat    = fs.statSync(caminho);

        if (stat.isDirectory()) {
            arquivos = arquivos.concat(listarArquivos(caminho));
        } else {
            arquivos.push(caminho);
        }
    }
    return arquivos;
}

async function processarEmLote(itens, limite, funcao) {
    const resultados = [];

    for (let i = 0; i < itens.length; i += limite) {
        const lote = itens.slice(i, i + limite);
        const res  = await Promise.all(lote.map(funcao));
        resultados.push(...res);
    }

    return resultados;
}

async function processarRom(caminho) {
    const ext         = path.extname(caminho).toLowerCase();
    const nomeArquivo = path.basename(caminho, ext);

    if (!EXTENSOES[ext]) return null;

    if (!validarRom(caminho, ext)) {
        console.log(`⛔ Ignorado: ${nomeArquivo}${ext}`);
        return { status: 'ignorado', nome: nomeArquivo };
    }

    try {
        const hash    = await calcularHash(caminho);
        const tamanho = fs.statSync(caminho).size;

        const dados = {
            nome:       nomeArquivo,
            plataforma: EXTENSOES[ext],
            regiao:     extrairRegiao(nomeArquivo),
            caminho,
            extensao:   ext,
            tamanho,
            hash_md5:   hash,
        };

        const inserido = romModel.inserirRom(dados);

        if (inserido) {
            console.log(`✅ ${nomeArquivo} [${EXTENSOES[ext]}]`);
            return { status: 'novo', dados };
        } else {
            console.log(`⚠️  Duplicata: ${nomeArquivo}`);
            return { status: 'duplicata', nome: nomeArquivo };
        }

    } catch (err) {
        console.error(`❌ Erro em ${nomeArquivo}:`, err.message);
        return { status: 'erro', nome: nomeArquivo };
    }
}

async function buscarMetadatasEmLote(novas) {
    await processarEmLote(novas, 3, async ({ dados }) => {
        try {
            const meta = await buscarMetadados(dados.nome, dados.plataforma);
            if (meta) {
                const roms = romModel.buscarRoms({ nome: dados.nome });
                if (roms.length > 0) {
                    romModel.atualizarMetadados(roms[0].id, meta);
                    console.log(`   🖼️  Capa salva: ${dados.nome}`);
                }
            }
        } catch (err) {
            console.error(`   ❌ Erro metadados ${dados.nome}:`, err.message);
        }
    });
}

async function escanearPasta(pastaRaiz) {
    const arquivos  = listarArquivos(pastaRaiz);
    const resultado = { total: 0, novos: 0, duplicatas: 0, erros: 0, ignorados: 0, lista: [] };

    const candidatos = arquivos.filter(a =>
        EXTENSOES[path.extname(a).toLowerCase()]
    );

    resultado.total = candidatos.length;
    console.log(`\n📦 ${candidatos.length} arquivos encontrados\n`);

    const resultados = await processarEmLote(candidatos, 5, processarRom);

    const novas = [];
    for (const r of resultados) {
        if (!r) continue;

        if (r.status === 'novo') {
            resultado.novos++;
            novas.push(r);
            resultado.lista.push({ ...r.dados, status: 'novo' });
        } else if (r.status === 'duplicata') {
            resultado.duplicatas++;
            resultado.lista.push({ nome: r.nome, status: 'duplicata' });
        } else if (r.status === 'ignorado') {
            resultado.ignorados++;
        } else if (r.status === 'erro') {
            resultado.erros++;
        }
    }

    if (novas.length > 0) {
        console.log(`\n🔍 Buscando metadados de ${novas.length} ROMs...\n`);
        await buscarMetadatasEmLote(novas);
    }

    return resultado;
}

async function verificarIntegridade() {
    const roms      = romModel.todasRoms();
    const resultado = [];

    await processarEmLote(roms, 5, async (rom) => {
        if (!fs.existsSync(rom.caminho)) {
            resultado.push({ ...rom, status: 'nao_encontrada' });
            return;
        }

        const hashAtual = await calcularHash(rom.caminho);
        resultado.push({
            ...rom,
            status: hashAtual === rom.hash_md5 ? 'ok' : 'corrompida'
        });
    });

    return resultado;
}

module.exports = { escanearPasta, verificarIntegridade };