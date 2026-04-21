// server/models/database.js
const path      = require('path');
const fs        = require('fs');
const initSqlJs = require('sql.js');

const DB_PATH = path.join(__dirname, '..', '..', 'roms.db');
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
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            nome          TEXT NOT NULL,
            plataforma    TEXT NOT NULL,
            regiao        TEXT DEFAULT 'Desconhecida',
            caminho       TEXT NOT NULL,
            extensao      TEXT,
            tamanho       INTEGER DEFAULT 0,
            hash_md5      TEXT UNIQUE,
            capa          TEXT DEFAULT NULL,
            nota          TEXT DEFAULT NULL,
            descricao     TEXT DEFAULT NULL,
            ultimo_acesso TEXT DEFAULT NULL,
            vezes_jogado  INTEGER DEFAULT 0,
            data_adicao   TEXT DEFAULT (datetime('now'))
        )
    `);

    salvarBanco();
    console.log('✅ Banco de dados pronto!');
}

function salvarBanco() {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function getDb() { // ✅ minúsculo
    return db;
}

module.exports = { iniciarBanco, salvarBanco, getDb }; // ✅ minúsculo