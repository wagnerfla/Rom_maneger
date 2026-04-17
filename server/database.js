const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..','roms.db'));

db.pragma('Jounal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS roms (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nome        TEXT NOT NULL,
    plataforma  TEXT NOT NULL,
    regiao      TEXT DEFAULT 'Desconhecida',
    caminho     TEXT NOT NULL,
    extensao    TEXT,
    tamanho     INTEGER DEFAULT 0,
    hash_md5    TEXT UNIQUE,
    data_adicao TEXT DEFAULT (datetime('now'))
  )
`);

function inserirRom(dados) {
    const stmt =db.prepare(`
        INSERT OR IGNORE INTO roms
        (nome, plataforma, regiao, caminho, extensao, tamanho, hash_md5)
        VALUES
        (@nome, @plataforma, @regiao, @caminho, @extensao, @tamanho, @hash_md5)
    `);

    const resultado = stmt.run(dados);
    return resultado.changes > 0;
}

function buscarRoms(filtros = {}) {
    let query = 'SELECT * FROM roms WHERE 1=1';
    const params = [];

    if (filtros.nome) {
        query += 'AND nome LIKE ?';
        params.push(`%${filtros.nome}%`);
    }

    if (filtros.plataforma) {
        query += 'AND plataforma = ?';
        params.push(filtros.plataforma);
    }

    if (filtros.regiao) {
        query += 'AND regiao = ?';
        params.push(filtros.regiao);
    }

    query += 'ORDER BY nome ASC';
    return db.prepare(query).all(...params);
}

function todasRoms() {
    return db.prepare('SELECT * FROM roms').all();
}

function deletarRom(id) {
    return db.prepare('DELETE FROM roms WHERE id = ?').run(id);
}

function estatisticas() {
    const total = db.prepare('SELECT COUNT(*) as total FROM roms').get();
    const porPlataforma = db.prepare(`
        SELECT plataforma, COUNT(*) as quantidade
        FROM roms
        GROUP BY plataforma
        ORDER BY quantidade DESC`).all();
    const porRegiao = db.prepare(`
         SELECT regiao, COUNT(*) as quantidade
           FROM roms
        GROUP BY regiao
        ORDER BY quantidade DESC`).all();
    const tamanhoTotal = db.prepare(
        'SELECT SUM(tamanho) as total FROM roms'
    ).get();

    return {total: total.total, porPlataforma, porRegiao, tamanhoTotal: tamanhoTotal.total};
}

module.exports = {inserirRom, buscarRoms, todasRoms, deletarRom, estatisticas};