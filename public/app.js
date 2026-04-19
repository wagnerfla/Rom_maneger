const API = 'http://localhost:3000/api';
let pastaSelecionada = null;

document.addEventListener('DOMContentLoaded', () => {
    buscar();
    carregarStats();
});

function confirmarPasta() {
    const caminho = document.getElementById('input-caminho').value.trim();

    if (!caminho) {
        mostrarMensagem('⚠️ Digite o caminho da pasta.', 'aviso');
        return;
    }

    pastaSelecionada = caminho;
    const el = document.getElementById('pasta-confirmada');
    el.textContent = `📁 Pasta: ${caminho}`;
    el.classList.remove('oculto');
    document.getElementById('btn-escanear').disabled = false;
    mostrarMensagem(`✅ Pasta confirmada!`, 'sucesso');
}

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
           `✅ Scan concluído: ${data.novos} novas | ${data.duplicatas} duplicatas | ${data.ignorados} ignoradas | ${data.erros} erros`,
    'sucesso'
        );
        buscar();
        carregarStats();
    } catch {
        mostrarMensagem('❌ Erro ao escanear.', 'erro');
    }
}

async function buscar() {
    const nome       = document.getElementById('busca-nome').value;
    const plataforma = document.getElementById('busca-plataforma').value;
    const regiao     = document.getElementById('busca-regiao').value;

    const params = new URLSearchParams();
    if (nome)       params.append('nome', nome);
    if (plataforma) params.append('plataforma', plataforma);
    if (regiao)     params.append('regiao', regiao);

    try {
        const res  = await fetch(`${API}/roms?${params}`);
        const data = await res.json();
        renderizarTabela(data.roms);
        document.getElementById('contagem').textContent =
            `${data.total} ROM(s) encontrada(s)`;
    } catch {
        mostrarMensagem('❌ Erro ao buscar ROMs.', 'erro');
    }
}

function renderizarTabela(roms) {
    const tbody = document.getElementById('tabela-roms');

    if (!roms || roms.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="6" class="centro">Nenhuma ROM encontrada</td></tr>`;
        return;
    }

    tbody.innerHTML = roms.map(rom => `
        <tr>
            <td>${rom.id}</td>
            <td class="nome">${rom.nome}</td>
            <td><span class="badge">${rom.plataforma}</span></td>
            <td>${rom.regiao}</td>
            <td>${formatarBytes(rom.tamanho)}</td>
            <td>
                <button onclick="deletar(${rom.id}, '${escapar(rom.nome)}')"
                        class="btn vermelho pequeno">🗑 Remover</button>
            </td>
        </tr>
    `).join('');
}

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

async function deletar(id, nome) {
    if (!confirm(`Remover "${nome}" do catálogo?\n(O arquivo não será apagado do disco)`)) return;

    try {
        await fetch(`${API}/roms/${id}`, { method: 'DELETE' });
        mostrarMensagem(`🗑 "${nome}" removida.`, 'sucesso');
        buscar();
        carregarStats();
    } catch {
        mostrarMensagem('❌ Erro ao remover ROM.', 'erro');
    }
}

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