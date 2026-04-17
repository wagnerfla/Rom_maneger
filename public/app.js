// public/app.js
const API = 'http://localhost:3000/api';

// ─── INICIALIZAÇÃO ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buscar();
  carregarStats();
});

// ─── BUSCA E LISTAGEM ──────────────────────────────────────────

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
  } catch (err) {
    mostrarMensagem('Erro ao buscar ROMs. Servidor está rodando?', 'erro');
  }
}

function renderizarTabela(roms) {
  const tbody = document.getElementById('tabela-roms');

  if (roms.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="centro">Nenhuma ROM encontrada</td></tr>`;
    return;
  }

  tbody.innerHTML = roms.map(rom => `
    <tr>
      <td>${rom.id}</td>
      <td class="nome">${rom.nome}</td>
      <td><span class="badge">${rom.plataforma}</span></td>
      <td>${rom.regiao}</td>
      <td>${formatarBytes(rom.tamanho)}</td>
      <td class="hash">${rom.hash_md5?.substring(0, 12)}...</td>
      <td>
        <button onclick="deletar(${rom.id}, '${escapar(rom.nome)}')"
                class="btn vermelho pequeno">🗑 Remover</button>
      </td>
    </tr>
  `).join('');
}

// ─── ESCANEAR ──────────────────────────────────────────────────

async function escanear() {
  mostrarMensagem('⏳ Escaneando arquivos... aguarde.', 'info');

  try {
    const res  = await fetch(`${API}/escanear`, { method: 'POST' });
    const data = await res.json();

    mostrarMensagem(
      `✅ Scan concluído: ${data.novos} novas | ${data.duplicatas} duplicatas | ${data.erros} erros`,
      'sucesso'
    );
    buscar();
    carregarStats();
  } catch (err) {
    mostrarMensagem('❌ Erro ao escanear. Verifique o servidor.', 'erro');
  }
}

// ─── VERIFICAR INTEGRIDADE ─────────────────────────────────────

async function verificar() {
  mostrarMensagem('⏳ Verificando integridade... pode demorar.', 'info');

  try {
    const res  = await fetch(`${API}/verificar`);
    const data = await res.json();
    const { ok, corrompidas, naoEncontradas } = data.resumo;

    mostrarMensagem(
      `🔍 Resultado: ✅ ${ok} OK | ⚠️ ${corrompidas} corrompidas | ❌ ${naoEncontradas} não encontradas`,
      corrompidas + naoEncontradas > 0 ? 'aviso' : 'sucesso'
    );
  } catch (err) {
    mostrarMensagem('❌ Erro ao verificar.', 'erro');
  }
}

// ─── DELETAR ───────────────────────────────────────────────────

async function deletar(id, nome) {
  if (!confirm(`Remover "${nome}" do catálogo?\n(O arquivo não será apagado do disco)`)) return;

  try {
    await fetch(`${API}/roms/${id}`, { method: 'DELETE' });
    mostrarMensagem(`🗑 "${nome}" removida do catálogo.`, 'sucesso');
    buscar();
    carregarStats();
  } catch (err) {
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
  document.getElementById('busca-nome').value = '';
  document.getElementById('busca-plataforma').value = '';
  document.getElementById('busca-regiao').value = '';
  buscar();
}

function formatarBytes(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function escapar(str) {
  return str.replace(/'/g, "\\'");
}

function mostrarMensagem(texto, tipo = 'info') {
  const el = document.getElementById('mensagem');
  el.textContent = texto;
  el.className   = `mensagem ${tipo}`;
  el.classList.remove('oculto');
  setTimeout(() => el.classList.add('oculto'), 5000); // some após 5s
}