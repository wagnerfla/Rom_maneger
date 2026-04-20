const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const DB_PATH = path.join(__dirname, '..', 'roms.db');
let db;

async function iniciarBanco() {
    const SQL = await initSqlJs();

    if (fs.existsSync(DB_PATH)) {
        const buffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(buffer);
    } else {
        db = new SQL.Database();
    }

    db.run(`
        CREATE TABLE IF NOT EXISTS roms (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            nome        TEXT NOT NULL,
            plataforma  TEXT NOT NULL,
            regiao      TEXT DEFAULT 'Desconhecida',
            caminho     TEXT NOT NULL,
            extensao    TEXT,
            tamanho     INTEGER DEFAULT 0,
            hash_md5    TEXT UNIQUE,
            capa  TEXT DEFAULT NULL,
            nota TEXT DEFAULT NULL,
            descricao TEXT DEFAULT NULL,
            data_adicao TEXT DEFAULT (datetime('now'))
        )
    `);

    salvarBanco();
    console.log('✅ Banco de dados pronto!');
}

function salvarBanco() {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function inserirRom(dados) {
    try {
        db.run(`
            INSERT OR IGNORE INTO roms
                (nome, plataforma, regiao, caminho, extensao, tamanho, hash_md5)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [dados.nome, dados.plataforma, dados.regiao, dados.caminho,
        dados.extensao, dados.tamanho, dados.hash_md5]);

        salvarBanco();
        const changes = db.exec('SELECT changes()')[0]?.values[0][0];
        return changes > 0;
    } catch (err) {
        console.error('Erro ao inserir:', err.message);
        return false;
    }
}

function buscarRoms(filtros = {}) {
    let query = 'SELECT * FROM roms WHERE 1=1';
    const params = [];

    if (filtros.nome) {
        query += ' AND nome LIKE ?';
        params.push(`%${filtros.nome}%`);
    }
    if (filtros.plataforma) {
        query += ' AND plataforma = ?';
        params.push(filtros.plataforma);
    }
    if (filtros.regiao) {
        query += ' AND regiao = ?';
        params.push(filtros.regiao);
    }

    query += ' ORDER BY nome ASC';

    const res = db.exec(query, params);
    if (!res.length) return [];

    const cols = res[0].columns;
    return res[0].values.map(row => {
        const obj = {};
        cols.forEach((col, i) => obj[col] = row[i]);
        return obj;
    });
}

function todasRoms() {
    const res = db.exec('SELECT * FROM roms');
    if (!res.length) return [];

    const cols = res[0].columns;
    return res[0].values.map(row => {
        const obj = {};
        cols.forEach((col, i) => obj[col] = row[i]);
        return obj;
    });
}

function deletarRom(id) {
    db.run('DELETE FROM roms WHERE id = ?', [id]);
    salvarBanco();
}

function estatisticas() {
    const totalRes = db.exec('SELECT COUNT(*) FROM roms');
    const total = totalRes[0]?.values[0][0] || 0;

    const platRes = db.exec(`
        SELECT plataforma, COUNT(*) as quantidade
        FROM roms GROUP BY plataforma ORDER BY quantidade DESC
    `);
    const porPlataforma = platRes[0]?.values.map(r => ({
        plataforma: r[0], quantidade: r[1]
    })) || [];

    const regRes = db.exec(`
        SELECT regiao, COUNT(*) as quantidade
        FROM roms GROUP BY regiao ORDER BY quantidade DESC
    `);
    const porRegiao = regRes[0]?.values.map(r => ({
        regiao: r[0], quantidade: r[1]
    })) || [];

    const tamRes = db.exec('SELECT SUM(tamanho) FROM roms');
    const tamanhoTotal = tamRes[0]?.values[0][0] || 0;

    return { total, porPlataforma, porRegiao, tamanhoTotal };
}

function atualizarMetadados(id, { capa, nota, descricao }) {
    db.run(
        'UPDATE roms SET capa = ?, nota = ?, descricao = ? WHERE id = ?',
        [capa, nota, descricao, id]
    );
    salvarBanco();
};

function atualizarCapa(id, capa) {
    db.run('UPDATE roms SET capa = ? WHERE id = ?', [capa, id]);
    salvarBanco();
};

module.exports = { iniciarBanco, inserirRom, buscarRoms, todasRoms, deletarRom, atualizarMetadados, atualizarCapa, estatisticas };