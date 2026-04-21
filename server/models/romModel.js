// server/models/romModel.js
const { getDb, salvarBanco } = require('./database'); 

function inserirRom(dados) {
    const db = getDb();
    try {
        db.run(`
            INSERT OR IGNORE INTO roms
                (nome, plataforma, regiao, caminho, extensao, tamanho, hash_md5)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            dados.nome, dados.plataforma, dados.regiao,
            dados.caminho, dados.extensao, dados.tamanho, dados.hash_md5
        ]);

        salvarBanco();
        const changes = db.exec('SELECT changes()')[0]?.values[0][0];
        return changes > 0;
    } catch (err) {
        console.error('Erro ao inserir ROM:', err.message);
        return false;
    }
}

function buscarRoms(filtros = {}) {
    const db     = getDb();
    let query    = 'SELECT * FROM roms WHERE 1=1';
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
    const db  = getDb();
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
    const db = getDb();
    db.run('DELETE FROM roms WHERE id = ?', [id]);
    salvarBanco();
}

function atualizarMetadados(id, { capa, nota, descricao }) {
    const db = getDb();
    db.run(
        'UPDATE roms SET capa = ?, nota = ?, descricao = ? WHERE id = ?',
        [capa, nota, descricao, id]
    );
    salvarBanco();
}

function atualizarCapa(id, capa) {
    const db = getDb();
    db.run('UPDATE roms SET capa = ? WHERE id = ?', [capa, id]);
    salvarBanco();
}

function registrarAcesso(id) {
    const db = getDb();
    db.run(`
        UPDATE roms
        SET ultimo_acesso = datetime('now'),
            vezes_jogado  = vezes_jogado + 1
        WHERE id = ?
    `, [id]);
    salvarBanco();
}

function estatisticas() {
    const db = getDb();

    const totalRes      = db.exec('SELECT COUNT(*) FROM roms');
    const total         = totalRes[0]?.values[0][0] || 0;

    const platRes       = db.exec(`
        SELECT plataforma, COUNT(*) as quantidade
        FROM roms GROUP BY plataforma ORDER BY quantidade DESC
    `);
    const porPlataforma = platRes[0]?.values.map(r => ({
        plataforma: r[0], quantidade: r[1]
    })) || [];

    const regRes    = db.exec(`
        SELECT regiao, COUNT(*) as quantidade
        FROM roms GROUP BY regiao ORDER BY quantidade DESC
    `);
    const porRegiao = regRes[0]?.values.map(r => ({
        regiao: r[0], quantidade: r[1]
    })) || [];

    const tamRes       = db.exec('SELECT SUM(tamanho) FROM roms');
    const tamanhoTotal = tamRes[0]?.values[0][0] || 0;

    return { total, porPlataforma, porRegiao, tamanhoTotal };
}

module.exports = {
    inserirRom,
    buscarRoms,
    todasRoms,
    deletarRom,
    atualizarMetadados,
    atualizarCapa,
    registrarAcesso,
    estatisticas
};