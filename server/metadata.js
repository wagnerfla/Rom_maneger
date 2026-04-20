// server/metadata.js
require('dotenv').config();
const axios = require('axios');

const API_KEY  = process.env.THEGAMESDB_KEY;
const BASE_URL = 'https://api.thegamesdb.net/v1';

const PLATAFORMAS = {
    'GBA':           5,
    'GameBoy':       4,
    'GameBoy Color': 41,
    'NES':           7,
    'SNES':          6,
    'N64':           3,
    'Nintendo DS':   8,
    '3DS':           4912,
    'PS1':           10,
    'PS2':           11,
};

function limparNome(nome) {
    return nome
        .replace(/\(.*?\)/g, '')
        .replace(/\[.*?\]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// ✅ Função buscarJogo — busca o jogo pelo nome
async function buscarJogo(nomeLimpo, plataforma) {
    const params = {
        apikey: API_KEY,
        name:   nomeLimpo,
        fields: 'overview,rating',
    };

    const plataformaId = PLATAFORMAS[plataforma];
    if (plataformaId) params['filter[platform]'] = plataformaId;

    const res = await axios.get(`${BASE_URL}/Games/ByGameName`, { params });

    if (!res.data?.data?.games?.length) return null;
    return res.data.data.games[0];
}

// ✅ Função buscarCapa — busca a imagem da capa pelo ID do jogo
async function buscarCapa(jogoId) {
    const res = await axios.get(`${BASE_URL}/Games/Images`, {
        params: {
            apikey:   API_KEY,
            games_id: jogoId,
            filter:   'boxart',
        }
    });

    const data    = res.data?.data;
    const imagens = data?.images?.[jogoId];
    if (!imagens) return null;

    const baseUrl = data.base_url?.original || 'https://cdn.thegamesdb.net/images/original/';
    const capa    = imagens.find(img => img.type === 'boxart' && img.side === 'front')
                 || imagens[0];

    return capa ? `${baseUrl}${capa.filename}` : null;
}

// ✅ Função principal — usa buscarJogo e buscarCapa
async function buscarMetadados(nomeRom, plataforma = '') {
    const nomeLimpo = limparNome(nomeRom);
    console.log(`   🔍 Buscando: "${nomeLimpo}" [${plataforma}]`);

    try {
        const jogo = await buscarJogo(nomeLimpo, plataforma);

        if (!jogo) {
            console.log(`   ⚠️  Nenhum resultado para "${nomeLimpo}"`);
            return null;
        }

        console.log(`   ✅ Encontrado: "${jogo.game_title}"`);

        const capa = await buscarCapa(jogo.id); // ← agora funciona

        return {
            capa:      capa          || null,
            nota:      jogo.rating   || null,
            descricao: jogo.overview || null,
        };

    } catch (err) {
        if (err.response?.status === 401) {
            console.error('   ❌ API Key inválida.');
        } else if (err.response?.status === 429) {
            console.error('   ❌ Limite de requisições atingido.');
        } else {
            console.error(`   ❌ Erro na API: ${err.message}`);
        }
        return null;
    }
}

module.exports = { buscarMetadados };