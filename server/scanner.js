const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {inserirRom} = require('./database');

const EXTENSOES = {
    '.gba': 'GBA',
    '.gb': 'GameBoy',
    '.gbc': 'GameBoy Color',
    '.nes': 'NES',
    '.smc': 'SNES',
    '.sfc': 'SNES'
};

function calcularHash(caminho) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('md5');
        const stream = fs.createReadStream(caminho, {highWaterMark: 8192});

        stream.on('data', (bloco) => hash.update(bloco));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', (err) => reject(err));
    });
};

function extrairRegiao(nome) {
    const regioes = [
        {padrao: /\(USA\)/i, regiao: 'USA'},
        {padrao: /\(U\)/i, regiao: 'USA'},
        {padrao: /\(EUR\)/i, regiao: 'EUR'},
        {padrao: /\(E\)/i, regiao: 'EUR'},
        {padrao: /\(JPN\)/i, regiao: 'JPN'},
        {padrao: /\(J\)/i, regiao: 'JPN'},
        {padrao: /\(BRA\)/i, regiao: 'BRA'},
        {padrao: /\(World\)/i, regiao: 'World'},
    ];

    for (const {padrao, regiao} of regioes) {
        if (padrao.test(nome)) return regiao;
    }
    return 'Desconhecida';
};

function listarArquivos (pasta) {
    let arquivos = [];

    for (const item of fs.readdirSync(pasta)) {
        const caminho = path.join(pasta, item);
        const stat = fs.statSync(caminho);

        if (stat.isDirectory()) {
            arquivos = arquivos.concat(listarArquivos(caminho));
        } else {
            arquivos.push(caminho);
        };
    };

    return arquivos;
};

async function escanearPasta(pastaRaiz) {
    const arquivos = listarArquivos(pastaRaiz);
    const resultado = {total: 0, novos: 0, duplicatas: 0, erros: 0, lista: []};

    for (const caminho of arquivos) {
        const ext = path.extname(caminho).toLowerCase();

        if (!EXTENSOES[ext]) continue;

        resultado.total++;
        const nomeArquivo = path.basename(caminho, ext);

        try {
            const hash = await calcularHash(caminho);
            const tamanho = fs.statSync(caminho).size;

            const dados = {
                nome: nomeArquivo,
                plataforma: EXTENSOES[ext],
                regiao: extrairRegiao(nomeArquivo),
                caminho: caminho,
                extensao: ext,
                tamanho: tamanho,
                hash_md5: hash,
            };

            const inserido = inserirRom(dados);

            if (inserido) {
                resultado.novos++;
                resultado.lista.push({...dados, status: 'novo'});
                console.log(`✅ ${nomeArquivo} [${EXTENSOES[ext]}]`);
            } else {
                resultado.duplicatas++;
                resultado.lista.push({nome: nomeArquivo, status: 'duplicata'});
                console.log(`⚠️ Duplicata ${nomeArquivo}`);
            };
        } catch (err) {
            resultado.erros++;
            console.error(`❌ Error em ${nomeArquivo}:`, err.message);
        };
    };

    return resultado;
};

async function verificarIntegridade() {
    const {todasRoms} = require('./database');
    const roms = todasRoms();
    const resultado = [];

    for (const rom of roms) {
        
        if(!fs.existsSync(rom.caminho)) {
            resultado.push({...rom, status: 'não encontrado'});
            continue;
        };
    
        const hashAtual = await calcularHash(rom.caminho);
        if(hashAtual === rom.hash_md5) {
            resultado.push({...rom, status:'ok'});
        } else {
            resultado.push({...rom, status: 'corrompida'});
        };
    };

    return resultado;
};

module.exports = {escanearPasta, verificarIntegridade};


