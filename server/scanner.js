// server/scanner.js
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const { inserirRom, buscarRoms, atualizarMetadados } = require('./database');
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

function calcularHash(caminho) {
    return new Promise((resolve, reject) => {
        const hash   = crypto.createHash('md5');
        const stream = fs.createReadStream(caminho, { highWaterMark: 8192 });

        stream.on('data',  bloco => hash.update(bloco));
        stream.on('end',   ()    => resolve(hash.digest('hex')));
        stream.on('error', err   => reject(err));
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

async function escanearPasta(pastaRaiz) {
    const arquivos  = listarArquivos(pastaRaiz);
    const resultado = { total: 0, novos: 0, duplicatas: 0, erros: 0, ignorados: 0, lista: [] };

    for (const caminho of arquivos) {
        const ext = path.extname(caminho).toLowerCase();
        if (!EXTENSOES[ext]) continue;

        resultado.total++;
        const nomeArquivo = path.basename(caminho, ext);

        // Valida se é realmente uma ROM antes de processar
        if (!validarRom(caminho, ext)) {
            resultado.ignorados++;
            console.log(`⛔ Ignorado (não é ROM): ${nomeArquivo}${ext}`);
            continue;
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

            const inserido = inserirRom(dados);

            if (inserido) {
                resultado.novos++;
                resultado.lista.push({ ...dados, status: 'novo' });
                console.log(`✅ ${nomeArquivo} [${EXTENSOES[ext]}]`);

                // Busca metadados automaticamente após inserir
                const meta = await buscarMetadados(nomeArquivo, EXTENSOES[ext]);
                if (meta) {
                    const roms = buscarRoms({ nome: nomeArquivo });
                    if (roms.length > 0) {
                        atualizarMetadados(roms[0].id, meta);
                        console.log(`   🖼️  Capa salva | 📝 ${meta.nota || 'sem classificação'}`);
                    }
                }

            } else {
                resultado.duplicatas++;
                resultado.lista.push({ nome: nomeArquivo, status: 'duplicata' });
                console.log(`⚠️  Duplicata: ${nomeArquivo}`);
            }

        } catch (err) {
            resultado.erros++;
            console.error(`❌ Erro em ${nomeArquivo}:`, err.message);
        }
    }

    return resultado;
}

async function verificarIntegridade() {
    const { todasRoms } = require('./database');
    const roms      = todasRoms();
    const resultado = [];

    for (const rom of roms) {
        if (!fs.existsSync(rom.caminho)) {
            resultado.push({ ...rom, status: 'nao_encontrada' });
            continue;
        }

        const hashAtual = await calcularHash(rom.caminho);
        resultado.push({
            ...rom,
            status: hashAtual === rom.hash_md5 ? 'ok' : 'corrompida'
        });
    }

    return resultado;
}

module.exports = { escanearPasta, verificarIntegridade };