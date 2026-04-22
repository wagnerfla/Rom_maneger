// public/app.js
const API = 'http://localhost:3000/api/roms';
let pastaSelecionada = null;

document.addEventListener('DOMContentLoaded', () => {
    buscar();
    carregarStats();

    const inputCaminho = document.getElementById('input-caminho');
    inputCaminho?.addEventListener('input', () => {
        const val = inputCaminho.value.trim();
        pastaSelecionada = val || null;
        document.getElementById('btn-escanear').disabled = !val;
    });
});

// ─── PASTA ─────────────────────────────────────────────────────
async function selecionarPastaDialog() {
    if (!window.electronAPI) {
        mostrarMensagem('⚠️ Seleção de pasta só funciona no app desktop.', 'aviso');
        return;
    }

    const caminho = await window.electronAPI.selecionarPasta();
    if (!caminho) return;

    pastaSelecionada = caminho;
    document.getElementById('input-caminho').value = caminho;
    const el = document.getElementById('pasta-confirmada');
    el.textContent = `📁 Pasta: ${caminho}`;
    el.classList.remove('oculto');
    document.getElementById('btn-escanear').disabled = false;
    mostrarMensagem(`✅ Pasta selecionada: ${caminho}`, 'sucesso');
}

// ─── ESCANEAR ──────────────────────────────────────────────────
async function escanear() {
    if (!pastaSelecionada) {
        mostrarMensagem('⚠️ Confirme uma pasta primeiro.', 'aviso');
        return;
    }

    mostrarMensagem('⏳ Escaneando arquivos... aguarde.', 'info');

    try {
        const res  = await fetch(`${API}/escanear`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ caminho: pastaSelecionada })
        });
        const data = await res.json();

        if (!data.sucesso) {
            mostrarMensagem(`❌ ${data.mensagem}`, 'erro');
            return;
        }

        mostrarMensagem(
            `✅ Scan concluído: ${data.novos} novas | ${data.duplicatas} duplicatas | ${data.ignorados || 0} ignoradas | ${data.erros} erros`,
            'sucesso'
        );
        buscar();
        carregarStats();
    } catch {
        mostrarMensagem('❌ Erro ao escanear.', 'erro');
    }
}

// ─── BUSCA ─────────────────────────────────────────────────────
async function buscar() {
    const nome       = document.getElementById('busca-nome').value;
    const plataforma = document.getElementById('busca-plataforma').value;
    const regiao     = document.getElementById('busca-regiao').value;

    const params = new URLSearchParams();
    if (nome)       params.append('nome', nome);
    if (plataforma) params.append('plataforma', plataforma);
    if (regiao)     params.append('regiao', regiao);

    try {
        const res  = await fetch(`${API}?${params}`);
        const data = await res.json();
        renderizarTabela(data.roms);
        document.getElementById('contagem').textContent =
            `${data.total} ROM(s) encontrada(s)`;
    } catch {
        mostrarMensagem('❌ Erro ao buscar ROMs.', 'erro');
    }
}

// ─── RENDERIZAR CARDS ──────────────────────────────────────────
function renderizarTabela(roms) {
    const container = document.getElementById('tabela-roms');

    if (!roms || roms.length === 0) {
        container.innerHTML = `<div class="vazio">Nenhuma ROM encontrada</div>`;
        return;
    }

    container.innerHTML = roms.map(rom => `
        <div class="card" id="card-${rom.id}">
            <img
                class="card-capa"
                src="${rom.capa || 'https://placehold.co/300x140?text=Sem+Capa'}"
                alt="${rom.nome}"
                onerror="this.src='https://placehold.co/300x140?text=Sem+Capa'"
            >
            <div class="card-info">
                <div class="card-nome" title="${rom.nome}">${rom.nome}</div>
                <div class="card-badges">
                    <span class="badge">${rom.plataforma}</span>
                    <span class="badge cinza">${rom.regiao}</span>
                    ${rom.nota ? `<span class="badge amarelo">📝 ${rom.nota}</span>` : ''}
                </div>
                <div class="card-descricao">
                    ${rom.descricao || '<em>Sem descrição disponível.</em>'}
                </div>
                <div class="card-acoes">
                    <span class="tamanho">${formatarBytes(rom.tamanho)}</span>
                    <button
                        onclick="buscarMeta(${rom.id}, '${escapar(rom.nome)}', '${rom.plataforma}')"
                        class="btn azul pequeno"
                        id="btn-meta-${rom.id}">
                        🔍 Buscar Info
                    </button>
                    <button
                        onclick="abrirModalCapa(${rom.id}, '${escapar(rom.nome)}')"
                        class="btn amarelo pequeno">
                        🖼️ Trocar Capa
                    </button>
                    <button
                        onclick="deletar(${rom.id}, '${escapar(rom.nome)}')"
                        class="btn vermelho pequeno">
                        🗑 Remover
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// ─── BUSCAR METADADOS DE UMA ROM ───────────────────────────────
async function buscarMeta(id, nome, plataforma) {
    const btn = document.getElementById(`btn-meta-${id}`);
    if (btn) {
        btn.disabled    = true;
        btn.textContent = '⏳ Buscando...';
    }

    mostrarMensagem(`🔍 Buscando informações de "${nome}"...`, 'info');

    try {
        const res  = await fetch(`${API}/${id}/metadados`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ nome, plataforma })
        });
        const data = await res.json();

        if (data.sucesso) {
            mostrarMensagem(`✅ Informações encontradas para "${nome}"!`, 'sucesso');

            const card = document.getElementById(`card-${id}`);
            if (card) {
                if (data.capa) {
                    card.querySelector('.card-capa').src = data.capa;
                }
                if (data.descricao) {
                    card.querySelector('.card-descricao').textContent = data.descricao;
                }
                if (data.nota) {
                    const badges        = card.querySelector('.card-badges');
                    const notaExistente = badges.querySelector('.badge.amarelo');
                    if (notaExistente) {
                        notaExistente.textContent = `📝 ${data.nota}`;
                    } else {
                        const novaNota       = document.createElement('span');
                        novaNota.className   = 'badge amarelo';
                        novaNota.textContent = `📝 ${data.nota}`;
                        badges.appendChild(novaNota);
                    }
                }
            }

            if (btn) {
                btn.textContent = '✅ Atualizado';
                btn.disabled    = true;
            }

        } else {
            mostrarMensagem(`⚠️ Nenhum resultado encontrado para "${nome}"`, 'aviso');
            if (btn) {
                btn.disabled    = false;
                btn.textContent = '🔍 Buscar Info';
            }
        }

    } catch {
        mostrarMensagem('❌ Erro ao buscar informações.', 'erro');
        if (btn) {
            btn.disabled    = false;
            btn.textContent = '🔍 Buscar Info';
        }
    }
}

// ─── BUSCAR METADADOS DE TODOS ─────────────────────────────────
async function buscarMetaTodos() {
    const res  = await fetch(`${API}`);
    const data = await res.json();

    const semMeta = data.roms.filter(rom => !rom.capa || !rom.descricao);

    if (semMeta.length === 0) {
        mostrarMensagem('✅ Todas as ROMs já têm informações!', 'sucesso');
        return;
    }

    mostrarMensagem(`⏳ Buscando informações de ${semMeta.length} ROMs... aguarde.`, 'info');

    let sucesso = 0;
    let falha   = 0;

    for (const rom of semMeta) {
        try {
            const res  = await fetch(`${API}/${rom.id}/metadados`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ nome: rom.nome, plataforma: rom.plataforma })
            });
            const data = await res.json();

            if (data.sucesso) sucesso++;
            else              falha++;

            await new Promise(r => setTimeout(r, 500));

        } catch {
            falha++;
        }
    }

    mostrarMensagem(
        `🔄 Concluído: ✅ ${sucesso} atualizadas | ⚠️ ${falha} não encontradas`,
        sucesso > 0 ? 'sucesso' : 'aviso'
    );

    buscar();
}

// ─── TROCAR CAPA ───────────────────────────────────────────────
function abrirModalCapa(id, nome) {
    const modalExistente = document.getElementById('modal-capa');
    if (modalExistente) modalExistente.remove();

    const modal = document.createElement('div');
    modal.id        = 'modal-capa';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3>🖼️ Trocar Capa</h3>
                <button onclick="fecharModal()" class="btn-fechar">✕</button>
            </div>
            <p class="modal-subtitulo">ROM: <strong>${nome}</strong></p>
            <div class="modal-body">
                <label>Cole a URL da nova capa:</label>
                <input
                    id="input-url-capa"
                    type="url"
                    placeholder="https://exemplo.com/capa.jpg"
                    oninput="previewCapa(this.value)"
                >
                <div class="preview-box">
                    <img
                        id="preview-capa"
                        src="https://placehold.co/300x140?text=Preview"
                        alt="Preview da capa"
                    >
                </div>
            </div>
            <div class="modal-footer">
                <button onclick="fecharModal()" class="btn cinza">Cancelar</button>
                <button onclick="salvarCapa(${id})" class="btn verde">✅ Salvar</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) fecharModal(); });
    setTimeout(() => document.getElementById('input-url-capa')?.focus(), 100);
}

function previewCapa(url) {
    const img = document.getElementById('preview-capa');
    if (!img) return;
    try {
        new URL(url);
        img.src     = url;
        img.onerror = () => img.src = 'https://placehold.co/300x140?text=URL+Inválida';
    } catch {
        img.src = 'https://placehold.co/300x140?text=Preview';
    }
}

async function salvarCapa(id) {
    const url = document.getElementById('input-url-capa')?.value.trim();

    if (!url) {
        mostrarMensagem('⚠️ Cole uma URL válida.', 'aviso');
        return;
    }

    try { new URL(url); } catch {
        mostrarMensagem('❌ URL inválida.', 'erro');
        return;
    }

    try {
        const res  = await fetch(`${API}/${id}/capa`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ capa: url })
        });
        const data = await res.json();

        if (data.sucesso) {
            mostrarMensagem('✅ Capa atualizada!', 'sucesso');
            const card = document.getElementById(`card-${id}`);
            if (card) card.querySelector('.card-capa').src = url;
            fecharModal();
        } else {
            mostrarMensagem(`❌ ${data.mensagem}`, 'erro');
        }
    } catch {
        mostrarMensagem('❌ Erro ao atualizar capa.', 'erro');
    }
}

function fecharModal() {
    const modal = document.getElementById('modal-capa');
    if (modal) modal.remove();
}

// ─── VERIFICAR INTEGRIDADE ─────────────────────────────────────
async function verificar() {
    mostrarMensagem('⏳ Verificando integridade...', 'info');
    try {
        const res  = await fetch(`${API}/verificar`);
        const data = await res.json();
        const { ok, corrompidas, naoEncontradas } = data.resumo;

        mostrarMensagem(
            `🔍 Resultado: ✅ ${ok} OK | ⚠️ ${corrompidas} corrompidas | ❌ ${naoEncontradas} não encontradas`,
            corrompidas + naoEncontradas > 0 ? 'aviso' : 'sucesso'
        );
    } catch {
        mostrarMensagem('❌ Erro ao verificar.', 'erro');
    }
}

// ─── DELETAR ───────────────────────────────────────────────────
async function deletar(id, nome) {
    if (!confirm(`Remover "${nome}" do catálogo?\n(O arquivo não será apagado do disco)`)) return;

    try {
        await fetch(`${API}/${id}`, { method: 'DELETE' });
        mostrarMensagem(`🗑 "${nome}" removida.`, 'sucesso');
        buscar();
        carregarStats();
    } catch {
        mostrarMensagem('❌ Erro ao remover ROM.', 'erro');
    }
}

// ─── ESTATÍSTICAS ──────────────────────────────────────────────
async function carregarStats() {
    try {
        const res  = await fetch(`${API}/stats`);
        const data = await res.json();
        const mb   = ((data.tamanhoTotal || 0) / 1024 / 1024).toFixed(1);
        document.getElementById('stats-bar').textContent =
            `📦 ${data.total} ROMs no catálogo | 💾 ${mb} MB`;
    } catch {
        document.getElementById('stats-bar').textContent = 'Stats indisponíveis';
    }
}

// ─── UTILITÁRIOS ───────────────────────────────────────────────
function limparFiltros() {
    document.getElementById('busca-nome').value       = '';
    document.getElementById('busca-plataforma').value = '';
    document.getElementById('busca-regiao').value     = '';
    buscar();
}

function formatarBytes(bytes) {
    if (!bytes)          return '0 B';
    if (bytes < 1024)    return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(2)} MB`;
}

function escapar(str) {
    return (str || '').replace(/'/g, "\\'");
}

function mostrarMensagem(texto, tipo = 'info') {
    const el = document.getElementById('mensagem');
    el.textContent = texto;
    el.className   = `mensagem ${tipo}`;
    el.classList.remove('oculto');
    setTimeout(() => el.classList.add('oculto'), 5000);
}