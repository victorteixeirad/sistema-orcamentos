let etapaAtual = 1;
let items = [];
let configEmpresa = {};
let modoSomenteLeituraAprovado = false;
let orcamentoAtualNumero = null;

let bibliotecaServicos = [
    { id: 1, area: 'APTOS / INTERNO', description: 'Aplicação de selador, massa e látex sobre gesso', unit: 'm²', price: 15.00 },
    { id: 2, area: 'SACADAS / HALL', description: 'Aplicação de selador e grafini em paredes', unit: 'm²', price: 18.00 },
    { id: 3, area: 'FACHADA', description: 'Aplicação de vedapren, selador e grafini (externa)', unit: 'm²', price: 22.00 },
    { id: 4, area: 'GRADES / PORTÃO', description: 'Aplicação de esmalte sintético em portão e grades', unit: 'm²', price: 38.00 },
    { id: 5, area: 'SALAS / QUARTOS', description: 'Pintura acrílica premium em paredes internas (2 demãos)', unit: 'm²', price: 20.00 }
];

let modelosObservacoes = [
    { id: 1, title: 'Padrão Profissional e Isolamento', desc: 'O serviço será executado de forma profissional. Respeitando as normas técnicas dos produtos a serem usados nesse projeto. Fazemos todo o isolamento devido para não causar danos ao imóvel. Buscamos sempre melhoria contínua entregando um projeto com qualidade.' },
    { id: 2, title: 'Garantia de Execução', desc: 'Garantia de 12 meses contra defeitos de aplicação e acabamento, conforme diretrizes técnicas dos fabricantes dos materiais utilizados.' },
    { id: 3, title: 'Condições de Fornecimento', desc: 'Os materiais e tintas especificados deverão ser disponibilizados no canteiro de obras pelo contratante conforme cronograma de etapas.' }
];

function salvarConfiguracoesEmpresa() {
    const razaoSocial = document.getElementById('configRazaoSocial')?.value || '';
    const cnpj = document.getElementById('configCnpj')?.value || '';
    const endereco = document.getElementById('configEndereco')?.value || '';
    const telefone = document.getElementById('configTelefone')?.value || '';
    const pixChave = document.getElementById('configPix')?.value || '';
    const logoUrl = document.getElementById('configLogoUrl')?.value || '';
    const qrcodeUrl = document.getElementById('configQrcodeUrl')?.value || '';
    const obsPadrao = document.getElementById('configObsPadrao')?.value || '';

    const payload = {
        razao_social: razaoSocial,
        cnpj: cnpj,
        endereco: endereco,
        telefone: telefone,
        pix_chave: pixChave,
        logo_url: logoUrl,
        qrcode_pix_url: qrcodeUrl,
        observacoes_padrao: obsPadrao
    };

    // Usando a mesma rota padrão do backend (/api/configuracoes) com método POST
    fetch('/api/configuracoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success' || data.success) {
            configEmpresa = payload;

            // Atualiza o preview visual imediatamente
            const imgLogo = document.getElementById('imgLogoDocumento');
            const iconeLogo = document.getElementById('iconePadraoLogo');
            if (logoUrl) {
                if (imgLogo) { imgLogo.src = logoUrl; imgLogo.classList.remove('hidden'); }
                if (iconeLogo) iconeLogo.classList.add('hidden');
            }

            const imgQr = document.getElementById('imgQrcodeDocumento');
            const iconeQr = document.getElementById('qrcodeIconDefault');
            if (qrcodeUrl) {
                if (imgQr) { imgQr.src = qrcodeUrl; imgQr.classList.remove('hidden'); }
                if (iconeQr) iconeQr.classList.add('hidden');
            }

            alert("✅ Configurações e imagens salvas com sucesso!");
        } else {
            alert("❌ Erro ao salvar configurações: " + (data.message || 'Erro desconhecido'));
        }
    })
    .catch(err => {
        console.error("Erro ao salvar configurações:", err);
        alert("❌ Falha de comunicação com o servidor ao salvar.");
    });
}

// Variável global para guardar a ação pendente de confirmação
let acaoConfirmacaoPendente = null;

function abrirModalConfirmacao(titulo, mensagem, iconeClass, textoBotaoConfirmar, callbackAcao) {
    const modal = document.getElementById('modalConfirmacaoGlobal');
    if (!modal) {
        // Se o HTML do modal não existir, usa o confirm comum como fallback
        if (confirm(`${titulo}\n\n${mensagem}`)) callbackAcao();
        return;
    }

    document.getElementById('modalConfirmTitulo').innerText = titulo;
    document.getElementById('modalConfirmMensagem').innerText = mensagem;
    document.getElementById('modalConfirmIcone').className = iconeClass || "fa-solid fa-triangle-exclamation text-amber-500 text-3xl";
    document.getElementById('btnConfirmarModal').innerText = textoBotaoConfirmar || "Confirmar";

    acaoConfirmacaoPendente = callbackAcao;
    modal.classList.remove('hidden');
}

function fecharModalConfirmacao() {
    const modal = document.getElementById('modalConfirmacaoGlobal');
    if (modal) modal.classList.add('hidden');
    acaoConfirmacaoPendente = null;
}

function executarConfirmacaoModal() {
    if (typeof acaoConfirmacaoPendente === 'function') {
        const acao = acaoConfirmacaoPendente;
        fecharModalConfirmacao();
        acao();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        carregarConfiguracoesEmpresa();
        carregarResumoDashboard();
        carregarServicosMasterAPI();
        
        const hoje = new Date().toISOString().split('T')[0];
        const dataInput = document.getElementById('orcDate');
        if (dataInput && !dataInput.value) dataInput.value = hoje;

        atualizarTotaisCalculados();
    } catch (e) {
        console.error("Erro na inicialização:", e);
    }
});

function toggleDarkMode() {
    const htmlEl = document.documentElement;
    const icone = document.getElementById('iconeTema');
    if (htmlEl.classList.contains('dark')) {
        htmlEl.classList.remove('dark');
        if (icone) icone.className = "fa-solid fa-sun text-gold-700 dark:text-gold-500";
    } else {
        htmlEl.classList.add('dark');
        if (icone) icone.className = "fa-solid fa-circle-half-stroke text-gold-700 dark:text-gold-500";
    }
}

function converterArquivoParaBase64(inputElement, tipo) {
    const file = inputElement.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const base64String = e.target.result;
        if (tipo === 'logo') {
            document.getElementById('configLogoUrl').value = base64String;
        } else if (tipo === 'qrcode') {
            document.getElementById('configQrcodeUrl').value = base64String;
        }
    };
    reader.readAsDataURL(file);
}

function carregarConfiguracoesEmpresa() {
    fetch('/api/configuracoes')
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            configEmpresa = data.config;
            
            if (document.getElementById('configRazaoSocial')) document.getElementById('configRazaoSocial').value = configEmpresa.razao_social || '';
            if (document.getElementById('configCnpj')) document.getElementById('configCnpj').value = configEmpresa.cnpj || '';
            if (document.getElementById('configEndereco')) document.getElementById('configEndereco').value = configEmpresa.endereco || '';
            if (document.getElementById('configTelefone')) document.getElementById('configTelefone').value = configEmpresa.telefone || '';
            if (document.getElementById('configPix')) document.getElementById('configPix').value = configEmpresa.pix_chave || '';
            if (document.getElementById('configLogoUrl')) document.getElementById('configLogoUrl').value = configEmpresa.logo_url || '';
            if (document.getElementById('configQrcodeUrl')) document.getElementById('configQrcodeUrl').value = configEmpresa.qrcode_pix_url || '';
            if (document.getElementById('configObsPadrao')) document.getElementById('configObsPadrao').value = configEmpresa.observacoes_padrao || '';

            if (document.getElementById('sidebarEmpresaNome')) document.getElementById('sidebarEmpresaNome').innerText = configEmpresa.razao_social ? configEmpresa.razao_social.split('-')[0].trim() : 'Deziderio';
            if (document.getElementById('docEmpresaNome')) document.getElementById('docEmpresaNome').innerText = configEmpresa.razao_social ? configEmpresa.razao_social.split('-')[0].trim() : 'DEZIDERIO';
            if (document.getElementById('docEmpresaInfo')) document.getElementById('docEmpresaInfo').innerText = `CNPJ: ${configEmpresa.cnpj || ''} · ${configEmpresa.endereco || ''}`;
            if (document.getElementById('docAssinaturaEmpresa')) document.getElementById('docAssinaturaEmpresa').innerText = configEmpresa.razao_social || 'Deziderio - Pintura e Acabamento';
            if (document.getElementById('previewPixKeyDisplay')) document.getElementById('previewPixKeyDisplay').innerText = `Chave PIX: ${configEmpresa.pix_chave || ''}`;
            if (document.getElementById('pixKey')) document.getElementById('pixKey').value = configEmpresa.pix_chave || '';

            const imgLogo = document.getElementById('imgLogoDocumento');
            const iconeLogo = document.getElementById('iconePadraoLogo');
            if (configEmpresa.logo_url) {
                if (imgLogo) { imgLogo.src = configEmpresa.logo_url; imgLogo.classList.remove('hidden'); }
                if (iconeLogo) iconeLogo.classList.add('hidden');
            } else {
                if (imgLogo) imgLogo.classList.add('hidden');
                if (iconeLogo) iconeLogo.classList.remove('hidden');
            }

            const imgQr = document.getElementById('imgQrcodeDocumento');
            const iconeQr = document.getElementById('qrcodeIconDefault');
            if (configEmpresa.qrcode_pix_url) {
                if (imgQr) { imgQr.src = configEmpresa.qrcode_pix_url; imgQr.classList.remove('hidden'); }
                if (iconeQr) iconeQr.classList.add('hidden');
            } else {
                if (imgQr) imgQr.classList.add('hidden');
                if (iconeQr) iconeQr.classList.remove('hidden');
            }
        }
    })
    .catch(err => console.error("Erro ao carregar configurações:", err));
}

function mudarAba(abaId) {
    ['dashboard', 'orcamentos', 'servicos', 'atividades', 'configuracoes'].forEach(id => {
        const sec = document.getElementById(`aba-${id}`);
        const navBtn = document.getElementById(`nav-${id}`);
        if (sec) sec.classList.add('hidden');
        if (navBtn) {
            navBtn.className = "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-all duration-200";
        }
    });

    const targetSec = document.getElementById(`aba-${abaId}`);
    const targetNav = document.getElementById(`nav-${abaId}`);
    if (targetSec) targetSec.classList.remove('hidden');
    if (targetNav) {
        targetNav.className = "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white/10 text-white transition shadow-sm";
    }

    if (abaId === 'orcamentos') atualizarTabelaGeralOrcamentos();
    if (abaId === 'dashboard') carregarResumoDashboard();
    if (abaId === 'servicos') carregarServicosMasterAPI();
    if (abaId === 'atividades') carregarAbaAtividades();
    if (abaId === 'configuracoes') carregarConfiguracoesEmpresa();
}

function carregarServicosMasterAPI() {
    fetch('/api/servicos/listar')
        .then(async res => {
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || `Erro HTTP ${res.status}`);
            return data;
        })
        .then(data => {
            if (data.status !== 'success' || !Array.isArray(data.servicos)) {
                throw new Error(data.message || 'Resposta inválida do servidor.');
            }
            bibliotecaServicos = data.servicos;
            renderizarTabelaServicosMaster();
        })
        .catch(err => {
            console.error("Erro ao carregar serviços:", err);
            const tbody = document.getElementById('tabelaServicosMasterBody');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-rose-500">Não foi possível carregar os serviços. Tente novamente.</td></tr>`;
            }
        });
}

function renderizarTabelaServicosMaster(filtro = '') {
    const tbody = document.getElementById('tabelaServicosMasterBody');
    const countEl = document.getElementById('countServicosMaster');
    if (!tbody) return;
    tbody.innerHTML = '';

    const termos = filtro.toLowerCase();
    const filtrados = bibliotecaServicos.filter(s => 
        (s.area && s.area.toLowerCase().includes(termos)) || 
        (s.description && s.description.toLowerCase().includes(termos))
    );

    if (countEl) countEl.innerText = bibliotecaServicos.length;

    if (filtrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-500 italic">Nenhum serviço cadastrado na base.</td></tr>`;
        return;
    }

    filtrados.forEach(s => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 dark:hover:bg-slate-800/40 transition border-b border-slate-200 dark:border-slate-800/60";
        tr.innerHTML = `
            <td class="py-3 px-3 font-mono font-bold text-gold-700 dark:text-gold-500 uppercase">${s.area}</td>
            <td class="py-3 px-3 font-medium text-slate-900 dark:text-white">${s.description}</td>
            <td class="py-3 px-3 text-center text-slate-600 dark:text-slate-300">${s.unit}</td>
            <td class="py-3 px-3 text-right font-bold text-slate-900 dark:text-white font-mono">${formatarMoeda(s.price)}</td>
            <td class="py-3 px-3 text-center flex justify-center gap-1.5">
                <button onclick="prepararEdicaoServicoMaster(${s.id})" class="bg-slate-100 dark:bg-slate-800 hover:bg-gold-600 hover:text-white text-slate-700 dark:text-slate-200 font-bold px-3 py-1.5 rounded-xl text-[11px] transition shadow-sm">
                    <i class="fa-solid fa-pen"></i> Editar
                </button>
                <button onclick="deletarServicoMaster(${s.id})" class="bg-rose-500 hover:bg-rose-600 text-white font-bold px-2.5 py-1.5 rounded-xl text-[11px] transition shadow-sm" title="Excluir">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filtrarAbaServicosMaster(termo) {
    renderizarTabelaServicosMaster(termo);
}

function salvarServicoMaster() {
    const idEl = document.getElementById('libEditId');
    const areaEl = document.getElementById('libMasterArea');
    const descEl = document.getElementById('libMasterDesc');
    const unitEl = document.getElementById('libMasterUnit');
    const priceEl = document.getElementById('libMasterPrice');

    const id = idEl && idEl.value ? parseInt(idEl.value, 10) : null;
    const area = areaEl ? areaEl.value.trim().toUpperCase() : '';
    const description = descEl ? descEl.value.trim() : '';
    const unit = unitEl ? unitEl.value : 'm²';
    const price = priceEl ? (parseFloat(priceEl.value) || 0) : 0;

    if (!area || !description) {
        alert("Preencha o local/área e a descrição do serviço.");
        return;
    }

    fetch('/api/servicos/salvar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, area, description, unit, price })
    })
    .then(async res => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || `Erro HTTP ${res.status}`);
        return data;
    })
    .then(data => {
        if (data.status !== 'success') throw new Error(data.message || 'Não foi possível salvar o serviço.');
        alert("Serviço salvo com sucesso!");
        limparFormServicoMaster();
        carregarServicosMasterAPI();
    })
    .catch(err => {
        console.error("Erro na API de serviços:", err);
        alert("Não foi possível salvar o serviço: " + err.message);
    });
}

function prepararEdicaoServicoMaster(id) {
    const serv = bibliotecaServicos.find(s => s.id === id);
    if (!serv) return;

    document.getElementById('libEditId').value = serv.id;
    document.getElementById('libMasterArea').value = serv.area;
    document.getElementById('libMasterDesc').value = serv.description;
    document.getElementById('libMasterUnit').value = serv.unit;
    document.getElementById('libMasterPrice').value = serv.price;

    document.getElementById('tituloFormServico').innerText = `Editar Serviço (ID: ${serv.id})`;
    document.getElementById('btnCancelarEdicaoServico').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function limparFormServicoMaster() {
    document.getElementById('libEditId').value = '';
    document.getElementById('libMasterArea').value = '';
    document.getElementById('libMasterDesc').value = '';
    document.getElementById('libMasterPrice').value = '';
    document.getElementById('tituloFormServico').innerText = 'Cadastrar Novo Serviço Padrão';
    document.getElementById('btnCancelarEdicaoServico').classList.add('hidden');
}

function deletarServicoMaster(id) {
    if (!confirm("Deseja realmente excluir este serviço da base?")) return;

    fetch(`/api/servicos/deletar/${id}`, { method: 'DELETE' })
        .then(async res => {
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || `Erro HTTP ${res.status}`);
            return data;
        })
        .then(data => {
            if (data.status !== 'success') throw new Error(data.message || 'Não foi possível excluir o serviço.');
            carregarServicosMasterAPI();
        })
        .catch(err => {
            console.error("Erro ao excluir serviço:", err);
            alert("Não foi possível excluir o serviço: " + err.message);
        });
}

function renderizarListaComentariosHistorico() {
    const container = document.getElementById('listaHistoricoComentarios');
    const containerAprovado = document.getElementById('listaComentariosAprovado');
    const hiddenInput = document.getElementById('internalNotesInput');
    if (!hiddenInput) return;

    const linhas = (hiddenInput.value || '').split('\n---\n').filter(l => l.trim());
    [container, containerAprovado].forEach(alvo => {
        if (!alvo) return;
        alvo.innerHTML = '';
        if (!linhas.length) {
            alvo.innerHTML = '<p class="text-[11px] text-slate-500 italic">Nenhum comentário registrado ainda.</p>';
            return;
        }
        linhas.forEach((linha, idx) => {
            const div = document.createElement('div');
            div.className = 'flex justify-between items-start gap-3 bg-amber-500/5 border border-amber-500/20 p-2.5 rounded-xl text-xs text-amber-800 dark:text-amber-200 shadow-sm';
            const texto = document.createElement('span');
            texto.className = 'font-mono text-[11px] whitespace-pre-line';
            texto.textContent = linha;
            div.appendChild(texto);
            if (!modoSomenteLeituraAprovado && alvo === container) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'text-rose-500 hover:text-rose-400 px-1.5';
                btn.innerHTML = '<i class="fa-solid fa-trash"></i>';
                btn.title = 'Remover comentário ainda não consolidado';
                btn.onclick = () => removerComentarioHistorico(idx);
                div.appendChild(btn);
            }
            alvo.appendChild(div);
        });
    });
}

function adicionarComentarioHistorico() {
    const inputUnico = document.getElementById('inputNovoComentarioUnico');
    const hiddenInput = document.getElementById('internalNotesInput');
    if (!inputUnico || !inputUnico.value.trim()) {
        alert('Digite algum texto no comentário.');
        return;
    }
    if (modoSomenteLeituraAprovado) {
        adicionarComentarioAprovado();
        return;
    }
    const agora = new Date();
    const novoTexto = `[${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}] ${inputUnico.value.trim()}`;
    hiddenInput.value = hiddenInput.value ? hiddenInput.value + '\n---\n' + novoTexto : novoTexto;
    inputUnico.value = '';
    renderizarListaComentariosHistorico();
}

function removerComentarioHistorico(index) {
    if (modoSomenteLeituraAprovado) return;
    const hiddenInput = document.getElementById('internalNotesInput');
    if (!hiddenInput) return;
    const linhas = hiddenInput.value.split('\n---\n');
    linhas.splice(index, 1);
    hiddenInput.value = linhas.join('\n---\n');
    renderizarListaComentariosHistorico();
}

function adicionarComentarioAprovado() {
    const input = document.getElementById('inputComentarioAprovado');
    const comentario = input?.value.trim();
    if (!comentario) return alert('Digite um comentário antes de registrar.');
    if (!orcamentoAtualNumero) return alert('Não foi possível identificar o orçamento aberto.');

    fetch('/api/comentario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orc_number: orcamentoAtualNumero, comentario })
    })
    .then(async res => ({ ok: res.ok, data: await res.json() }))
    .then(({ ok, data }) => {
        if (!ok || data.status !== 'success') throw new Error(data.message || 'Não foi possível registrar o comentário.');
        const hidden = document.getElementById('internalNotesInput');
        if (hidden) hidden.value = data.internal_notes || '';
        if (input) input.value = '';
        renderizarListaComentariosHistorico();
    })
    .catch(err => alert('Erro ao registrar comentário: ' + err.message));
}

function aplicarModoSomenteLeituraAprovado(aprovado) {
    modoSomenteLeituraAprovado = Boolean(aprovado);
    const painel = document.getElementById('painelComentariosAprovado');
    const botoesNavegacao = document.querySelector('#visao-wizard-orcamento > div:last-child');
    const btnSalvar = document.querySelector('#etapa-conteudo-4 button[onclick="salvarOrcamentoNoBanco()"]');

    [1, 2, 3].forEach(etapa => {
        const bloco = document.getElementById(`etapa-conteudo-${etapa}`);
        if (!bloco) return;
        bloco.querySelectorAll('input, select, textarea, button').forEach(el => {
            el.disabled = modoSomenteLeituraAprovado;
        });
        bloco.classList.toggle('opacity-75', modoSomenteLeituraAprovado);
    });
    const status = document.getElementById('orcStatusSelect');
    if (status) status.disabled = modoSomenteLeituraAprovado;
    if (painel) painel.classList.toggle('hidden', !modoSomenteLeituraAprovado);
    if (botoesNavegacao) botoesNavegacao.classList.toggle('hidden', modoSomenteLeituraAprovado);
    if (btnSalvar) btnSalvar.classList.toggle('hidden', modoSomenteLeituraAprovado);
    renderizarListaComentariosHistorico();
}

function deletarOrcamentoComDuplaConfirmacao(orcNumber) {
    abrirModalConfirmacao(
        "⚠️ Excluir Orçamento",
        `Deseja realmente excluir o orçamento ${orcNumber}? Esta ação é irreversível e apagará todos os dados associados.`,
        "fa-solid fa-trash-can text-rose-500 text-3xl",
        "Sim, Excluir",
        () => {
            fetch(`/api/deletar/${orcNumber}`, { method: 'DELETE' })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    carregarResumoDashboard();
                    atualizarTabelaGeralOrcamentos();
                } else {
                    alert("Erro ao excluir: " + data.message);
                }
            });
        }
    );
}

function carregarAbaAtividades() {
    fetch('/api/listar')
    .then(res => res.json())
    .then(data => {
        const container = document.getElementById('listaAtividadesGlobal');
        if (!container) return;
        container.innerHTML = '';

        if (!data || data.length === 0) {
            container.innerHTML = `<p class="text-xs text-slate-500 italic">Nenhuma atividade registrada.</p>`;
            return;
        }

        data.forEach(item => {
            const div = document.createElement('div');
            div.className = "bg-white dark:bg-navy-950 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1.5 shadow-sm";
            
            div.innerHTML = `
                <div class="flex justify-between items-center text-xs">
                    <span class="font-bold font-mono text-gold-700 dark:text-gold-400">${item.orc_number} · ${item.obra_name || 'Obra'}</span>
                    <span class="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20">${item.status || 'Enviado'}</span>
                </div>
                <p class="text-slate-700 dark:text-slate-300 text-[11px]">Cliente: <b>${item.client_name || '---'}</b> · Total: <b>${formatarMoeda(item.total_final)}</b></p>
                <p class="text-slate-500 text-[10px]"><i class="fa-solid fa-clock"></i> Última atualização de status: ${item.status_updated_at || item.created_at || '---'}</p>
                ${item.internal_notes ? `<div class="mt-2 p-2.5 bg-amber-500/5 border border-amber-500/20 rounded-xl text-[11px] text-amber-700 dark:text-amber-300 font-mono whitespace-pre-line"><b>Notas Internas / Histórico:</b>\n${item.internal_notes.replace(/\n---\n/g, '\n')}</div>` : ''}
            `;
            container.appendChild(div);
        });
    })
    .catch(err => console.error("Erro ao carregar atividades:", err));
}

function alterarStatusRapido(orcNumber, novoStatus) {
    if (novoStatus === 'Aprovado') {
        abrirModalConfirmacao(
            "🔒 Bloquear e Concluir Orçamento",
            `Ao alterar o status para "Aprovado", o orçamento ${orcNumber} será faturado e TRAVADO para edições futuras. Deseja consolidar este documento?`,
            "fa-solid fa-lock text-amber-500 text-3xl",
            "Sim, Aprovar e Travar",
            () => {
                executarAlteracaoStatus(orcNumber, novoStatus);
            }
        );
    } else {
        executarAlteracaoStatus(orcNumber, novoStatus);
    }
}

function executarAlteracaoStatus(orcNumber, novoStatus) {
    fetch('/api/atualizar_status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orc_number: orcNumber, status: novoStatus })
    })
    .then(res => res.json())
    .then(data => {
        carregarResumoDashboard();
        atualizarTabelaGeralOrcamentos();
    });
}

function abrirWizardNovoOrcamentoLimpo() {
    orcamentoAtualNumero = null;
    aplicarModoSomenteLeituraAprovado(false);
    const visaoLista = document.getElementById('visao-lista-orcamentos');
    const visaoWizard = document.getElementById('visao-wizard-orcamento');
    if (visaoLista) visaoLista.classList.add('hidden');
    if (visaoWizard) visaoWizard.classList.remove('hidden');
    
    items = [];
    document.getElementById('obraName').value = '';
    document.getElementById('clientName').value = '';
    document.getElementById('clientContact').value = '';
    document.getElementById('clientDoc').value = '';
    document.getElementById('clientPhone').value = '';
    document.getElementById('clientAddress').value = '';
    document.getElementById('discountInput').value = '0';
    document.getElementById('notesInput').value = configEmpresa.observacoes_padrao || 'O serviço será executado de forma profissional.';
    document.getElementById('internalNotesInput').value = '';
    renderizarListaComentariosHistorico();
    
    const hoje = new Date().toISOString().split('T')[0];
    const dataInput = document.getElementById('orcDate');
    if (dataInput) dataInput.value = hoje;

    gerarNovoNumeroOrcamento();
    renderizarTabelaItensEditor();
    irParaEtapa(1);
}

function fecharWizardVoltarLista() {
    const visaoLista = document.getElementById('visao-lista-orcamentos');
    const visaoWizard = document.getElementById('visao-wizard-orcamento');
    if (visaoWizard) visaoWizard.classList.add('hidden');
    if (visaoLista) visaoLista.classList.remove('hidden');
    atualizarTabelaGeralOrcamentos();
    carregarResumoDashboard();
}

function irParaEtapa(numeroEtapa) {
    etapaAtual = numeroEtapa;
    
    [1, 2, 3, 4].forEach(i => {
        const stepContent = document.getElementById(`etapa-conteudo-${i}`);
        const stepBar = document.getElementById(`step-bar-${i}`);
        if (stepContent) stepContent.classList.add('hidden');
        if (stepBar) {
            stepBar.className = i < etapaAtual
                ? "h-1.5 rounded-full bg-gold-600 dark:bg-gold-500 transition-all"
                : i === etapaAtual
                    ? "h-1.5 rounded-full step-bar-atual transition-all"
                    : "h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 transition-all";
        }
    });

    const activeContent = document.getElementById(`etapa-conteudo-${etapaAtual}`);
    if (activeContent) activeContent.classList.remove('hidden');

    const indicador = document.getElementById('etapaIndicador');
    if (indicador) indicador.innerText = `Etapa ${etapaAtual} de 4`;
    
    const btnAnterior = document.getElementById('btnWizardAnterior');
    const btnProximo = document.getElementById('btnWizardProximo');

    if (btnAnterior) btnAnterior.disabled = (etapaAtual === 1);
    
    if (btnProximo) {
        if (etapaAtual === 4) {
            btnProximo.innerHTML = `Concluir <i class="fa-solid fa-check"></i>`;
            atualizarPreviewDocumentoFinal();
        } else {
            btnProximo.innerHTML = `Próxima etapa <i class="fa-solid fa-arrow-right"></i>`;
        }
    }
}

function wizardAvancarEtapa() {
    if (etapaAtual < 4) {
        irParaEtapa(etapaAtual + 1);
    } else {
        salvarOrcamentoNoBancoSilencioso();
    }
}

function wizardVoltarEtapa() {
    if (etapaAtual > 1) {
        irParaEtapa(etapaAtual - 1);
    }
}

function gerarNovoNumeroOrcamento() {
    const anoAtual = new Date().getFullYear();
    const seq = Math.floor(1000 + Math.random() * 9000);
    const num = `ORC-${anoAtual}-${seq}`;
    
    const disp1 = document.getElementById('orcNumberDisplay');
    const disp2 = document.getElementById('previewOrcNumber');
    if (disp1) disp1.innerText = num;
    if (disp2) disp2.innerText = num;
}

function renderizarTabelaItensEditor() {
    const tbody = document.getElementById('tabelaItensEditorBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-slate-500 italic">Nenhum item adicionado. Clique em "Adicionar Item" ou use a biblioteca.</td></tr>`;
        return;
    }

    items.forEach((item, index) => {
        const tr = document.createElement('tr');
        const totalItem = (item.qty || 0) * (item.unitPrice || 0);

        tr.innerHTML = `
            <td class="p-2">
                <input type="text" value="${item.area}" onchange="atualizarItemProp(${index}, 'area', this.value)" class="w-full bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-900 dark:text-white font-mono uppercase outline-none shadow-sm">
            </td>
            <td class="p-2">
                <input type="text" value="${item.description}" onchange="atualizarItemProp(${index}, 'description', this.value)" class="w-full bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-900 dark:text-white outline-none shadow-sm">
            </td>
            <td class="p-2 text-center">
                <select onchange="atualizarItemProp(${index}, 'unit', this.value)" class="w-20 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5 text-slate-900 dark:text-white text-center outline-none shadow-sm">
                    <option value="m²" ${item.unit === 'm²' ? 'selected' : ''}>m²</option>
                    <option value="un" ${item.unit === 'un' ? 'selected' : ''}>un</option>
                    <option value="pç" ${item.unit === 'pç' ? 'selected' : ''}>pç</option>
                    <option value="cj" ${item.unit === 'cj' ? 'selected' : ''}>cj</option>
                </select>
            </td>
            <td class="p-2 text-center">
                <input type="number" step="0.01" value="${item.qty}" onchange="atualizarItemProp(${index}, 'qty', parseFloat(this.value))" class="w-20 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5 text-slate-900 dark:text-white text-center outline-none shadow-sm">
            </td>
            <td class="p-2 text-right">
                <input type="number" step="0.01" value="${item.unitPrice}" onchange="atualizarItemProp(${index}, 'unitPrice', parseFloat(this.value))" class="w-24 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-900 dark:text-white text-right outline-none shadow-sm">
            </td>
            <td class="p-2 text-right font-bold text-gold-700 dark:text-gold-500 font-mono">
                ${formatarMoeda(totalItem)}
            </td>
            <td class="p-2 text-center">
                <button onclick="removerItemServico(${index})" class="text-rose-500 hover:text-rose-400 p-1">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function adicionarNovoItemServico() {
    items.push({ area: 'NOVO', description: 'Serviço de pintura geral', unit: 'm²', qty: 1, unitPrice: 0 });
    renderizarTabelaItensEditor();
    atualizarTotaisCalculados();
}

function removerItemServico(index) {
    items.splice(index, 1);
    renderizarTabelaItensEditor();
    atualizarTotaisCalculados();
}

function atualizarItemProp(index, prop, val) {
    items[index][prop] = val;
    renderizarTabelaItensEditor();
    atualizarTotaisCalculados();
}

function calcularSubtotal() {
    return items.reduce((acc, i) => acc + ((i.qty || 0) * (i.unitPrice || 0)), 0);
}

function tratarTrocaMetodoPagamento() {
    const selectEl = document.getElementById('paymentMethodSelect');
    if (!selectEl) return;
    const m = selectEl.value;
    
    const boxPix = document.getElementById('boxPixKey');
    const boxQr = document.getElementById('boxQrCodeVisual');
    const boxCc = document.getElementById('boxCartaoCreditoConfig');
    const descPay = document.getElementById('previewPaymentDesc');

    if (m === 'PIX') {
        if (boxPix) boxPix.classList.remove('hidden');
        if (boxQr) boxQr.classList.remove('hidden');
        if (boxCc) boxCc.classList.add('hidden');
        if (descPay) descPay.innerText = "PIX / Transferência Instantânea";
    } else if (m === 'CartaoCredito') {
        if (boxPix) boxPix.classList.add('hidden');
        if (boxQr) boxQr.classList.add('hidden');
        if (boxCc) boxCc.classList.remove('hidden');
        if (descPay) descPay.innerText = "Cartão de Crédito";
    } else {
        if (boxPix) boxPix.classList.add('hidden');
        if (boxQr) boxQr.classList.add('hidden');
        if (boxCc) boxCc.classList.add('hidden');
        if (descPay) descPay.innerText = m;
    }
    atualizarTotaisCalculados();
}

function atualizarTotaisCalculados() {
    const sub = calcularSubtotal();
    const descInput = document.getElementById('discountInput');
    const desc = descInput ? (parseFloat(descInput.value) || 0) : 0;
    
    const metodoSelect = document.getElementById('paymentMethodSelect');
    const metodo = metodoSelect ? metodoSelect.value : 'PIX';
    
    let subAjustado = Math.max(0, sub - desc);
    let valorJuros = 0;

    const linhaTaxa = document.getElementById('linhaTaxaMaquininha');
    const labelTaxa = document.getElementById('labelTaxaMaq');
    const valTaxa = document.getElementById('previewTaxaMaqValor');
    const descPay = document.getElementById('previewPaymentDesc');

    if (metodo === 'CartaoCredito') {
        const parcelasInput = document.getElementById('ccInstallments');
        const taxaInput = document.getElementById('ccFeePercent');
        
        const parcelas = parcelasInput ? (parcelasInput.value || '10x') : '10x';
        const taxaPct = taxaInput ? (parseFloat(taxaInput.value) || 0) : 0;
        
        valorJuros = subAjustado * (taxaPct / 100);
        subAjustado += valorJuros;

        if (linhaTaxa) linhaTaxa.classList.remove('hidden');
        if (labelTaxa) labelTaxa.innerText = `Taxa Maquininha (${taxaPct}%):`;
        if (valTaxa) valTaxa.innerText = `+ ${formatarMoeda(valorJuros)}`;
        if (descPay) descPay.innerText = `Parcelado em ${parcelas} (+ ${taxaPct}% taxa maquininha)`;
    } else {
        if (linhaTaxa) linhaTaxa.classList.add('hidden');
    }

    const totalFinal = subAjustado;
    const pctInput = document.getElementById('downPaymentPercent');
    const pctEntrada = pctInput ? (parseFloat(pctInput.value) || 50) : 50;
    
    const valEntrada = totalFinal * (pctEntrada / 100);
    const valRestante = totalFinal - valEntrada;

    const subEl = document.getElementById('previewSubtotal');
    const descEl = document.getElementById('previewDiscount');
    const totEl = document.getElementById('previewTotal');
    const entEl = document.getElementById('previewValorEntrada');
    const restEl = document.getElementById('previewValorRestante');
    const lblEntrada = document.getElementById('labelEntradaText');
    const lblPct = document.getElementById('previewLabelPorcentagem');

    if (subEl) subEl.innerText = formatarMoeda(sub);
    if (descEl) descEl.innerText = `- ${formatarMoeda(desc)}`;
    if (totEl) totEl.innerText = formatarMoeda(totalFinal);
    if (entEl) entEl.innerText = formatarMoeda(valEntrada);
    if (restEl) restEl.innerText = formatarMoeda(valRestante);
    if (lblEntrada) lblEntrada.innerText = `Entrada (${pctEntrada}%):`;
    if (lblPct) lblPct.innerText = pctEntrada;
}

function formatarMoeda(val) {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function abrirModalBibliotecaServicos() {
    carregarServicosMasterAPI();
    renderizarListaBibliotecaModal();
    const modal = document.getElementById('bibliotecaModal');
    if (modal) modal.classList.remove('hidden');
}

function fecharModalBiblioteca() {
    const modal = document.getElementById('bibliotecaModal');
    if (modal) modal.classList.add('hidden');
}

function renderizarListaBibliotecaModal(filtro = '') {
    const container = document.getElementById('listaServicosBibliotecaContainer');
    if (!container) return;
    container.innerHTML = '';

    const termos = filtro.toLowerCase();
    const filtrados = bibliotecaServicos.filter(s => 
        (s.area && s.area.toLowerCase().includes(termos)) || 
        (s.description && s.description.toLowerCase().includes(termos)) || 
        (s.unit && s.unit.toLowerCase().includes(termos))
    );

    if (filtrados.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-500 italic text-center py-4">Nenhum serviço encontrado.</p>`;
        return;
    }

    filtrados.forEach(s => {
        const div = document.createElement('div');
        div.className = "flex items-center justify-between bg-white dark:bg-navy-950 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 transition shadow-sm";
        div.innerHTML = `
            <label class="flex items-center gap-3 cursor-pointer flex-1">
                <input type="checkbox" value="${s.id}" onchange="atualizarContadorSelecionadosLib()" class="checkbox-servico-lib w-4 h-4 rounded bg-white dark:bg-navy-900 border-slate-300 dark:border-slate-700 text-gold-600 focus:ring-0">
                <div class="flex flex-wrap items-center gap-2 text-xs">
                    <span class="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono px-2 py-0.5 rounded-lg font-bold">${s.area}</span>
                    <span class="text-slate-800 dark:text-slate-200 font-medium">${s.description}</span>
                    <span class="text-slate-500 text-[11px]">(${s.unit} - ${formatarMoeda(s.price)})</span>
                </div>
            </label>
            <button onclick="deletarServicoMaster(${s.id}); setTimeout(renderizarListaBibliotecaModal, 300);" class="text-rose-500 hover:text-rose-400 p-1">
                <i class="fa-solid fa-trash text-xs"></i>
            </button>
        `;
        container.appendChild(div);
    });
    atualizarContadorSelecionadosLib();
}

function filtrarBibliotecaServicos() {
    const input = document.getElementById('libSearchInput');
    if (input) renderizarListaBibliotecaModal(input.value);
}

function toggleMarcarTodosBiblioteca(masterCheckbox) {
    const checkboxes = document.querySelectorAll('.checkbox-servico-lib');
    checkboxes.forEach(chk => chk.checked = masterCheckbox.checked);
    atualizarContadorSelecionadosLib();
}

function atualizarContadorSelecionadosLib() {
    const checkboxes = document.querySelectorAll('.checkbox-servico-lib');
    const selecionados = document.querySelectorAll('.checkbox-servico-lib:checked');
    const contador = document.getElementById('contadorSelecionadosLib');
    if (contador) contador.innerText = `${selecionados.length} selecionados`;
    
    const master = document.getElementById('checkMarcarTodos');
    if (master) {
        master.checked = (checkboxes.length > 0 && selecionados.length === checkboxes.length);
    }
}

function salvarNovoServicoNaBiblioteca() {
    const areaInput = document.getElementById('libNewArea');
    const descInput = document.getElementById('libNewDesc');
    const unitInput = document.getElementById('libNewUnit');
    const priceInput = document.getElementById('libNewPrice');

    const area = areaInput ? areaInput.value.trim().toUpperCase() : '';
    const description = descInput ? descInput.value.trim() : '';
    const unit = unitInput ? unitInput.value : 'm²';
    const price = priceInput ? (parseFloat(priceInput.value) || 0) : 0;

    if (!area || !description) {
        alert("Preencha o local/área e a descrição.");
        return;
    }

    const payload = { id: null, area, description, unit, price };

    fetch('/api/servicos/salvar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            if (areaInput) areaInput.value = '';
            if (descInput) descInput.value = '';
            if (priceInput) priceInput.value = '';
            carregarServicosMasterAPI();
            setTimeout(() => renderizarListaBibliotecaModal(), 200);
            alert("✅ Serviço cadastrado na biblioteca com sucesso!");
        } else {
            alert("❌ Erro ao cadastrar serviço.");
        }
    })
    .catch(err => {
        const novoId = bibliotecaServicos.length > 0 ? Math.max(...bibliotecaServicos.map(s => s.id)) + 1 : 1;
        bibliotecaServicos.push({ id: novoId, area, description, unit, price });
        if (areaInput) areaInput.value = '';
        if (descInput) descInput.value = '';
        if (priceInput) priceInput.value = '';
        renderizarListaBibliotecaModal();
        alert("✅ Serviço cadastrado com sucesso!");
    });
}

function inserirServicosSelecionadosNoOrcamento() {
    const checkboxes = document.querySelectorAll('.checkbox-servico-lib:checked');
    if (checkboxes.length === 0) {
        alert("Selecione pelo menos um serviço.");
        return;
    }

    checkboxes.forEach(chk => {
        const servId = parseInt(chk.value);
        const servObj = bibliotecaServicos.find(s => s.id === servId);
        if (servObj) {
            items.push({
                area: servObj.area.split('/')[0].trim(),
                description: servObj.description,
                unit: servObj.unit,
                qty: 1,
                unitPrice: servObj.price
            });
        }
    });

    renderizarTabelaItensEditor();
    atualizarTotaisCalculados();
    fecharModalBiblioteca();
}

function abrirModalObservacoesProntas() {
    renderizarListaModelosObs();
    const modal = document.getElementById('obsModal');
    if (modal) modal.classList.remove('hidden');
}

function fecharModalObservacoes() {
    const modal = document.getElementById('obsModal');
    if (modal) modal.classList.add('hidden');
}

function renderizarListaModelosObs() {
    const container = document.getElementById('listaModelosObsContainer');
    if (!container) return;
    container.innerHTML = '';

    modelosObservacoes.forEach(m => {
        const div = document.createElement('div');
        div.className = "bg-white dark:bg-navy-950 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 transition flex flex-col gap-1.5 shadow-sm";
        div.innerHTML = `
            <div class="flex justify-between items-center">
                <span class="font-bold text-xs text-gold-700 dark:text-gold-400">${m.title}</span>
                <div class="flex gap-2">
                    <button onclick="usarModeloObs(${m.id})" class="bg-gold-600 dark:bg-gold-500 hover:bg-gold-700 dark:hover:bg-gold-600 text-white dark:text-navy-950 font-bold px-3 py-1 rounded-xl text-[10px] shadow-sm">Usar</button>
                    <button onclick="removerModeloObs(${m.id})" class="text-rose-500 hover:text-rose-400 px-1 text-xs"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
            <p class="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">${m.desc}</p>
        `;
        container.appendChild(div);
    });
}

function salvarNovoModeloObs() {
    const titleInput = document.getElementById('obsNewTitle');
    const descInput = document.getElementById('obsNewDesc');
    const title = titleInput ? titleInput.value.trim() : '';
    const desc = descInput ? descInput.value.trim() : '';

    if (!title || !desc) {
        alert("Preencha o título e o descritivo.");
        return;
    }

    const novoId = modelosObservacoes.length > 0 ? Math.max(...modelosObservacoes.map(m => m.id)) + 1 : 1;
    modelosObservacoes.push({ id: novoId, title, desc });

    if (titleInput) titleInput.value = '';
    if (descInput) descInput.value = '';
    renderizarListaModelosObs();
    alert("✅ Modelo salvo com sucesso!");
}

function removerModeloObs(id) {
    modelosObservacoes = modelosObservacoes.filter(m => m.id !== id);
    renderizarListaModelosObs();
}

function usarModeloObs(id) {
    const mod = modelosObservacoes.find(m => m.id === id);
    if (mod) {
        const notesInput = document.getElementById('notesInput');
        if (notesInput) notesInput.value = mod.desc;
        fecharModalObservacoes();
    }
}

function atualizarPreviewDocumentoFinal() {
    const obraEl = document.getElementById('obraName');
    const clientEl = document.getElementById('clientName');
    const contactEl = document.getElementById('clientContact');
    const docEl = document.getElementById('clientDoc');
    const phoneEl = document.getElementById('clientPhone');
    const addressEl = document.getElementById('clientAddress');

    if (obraEl) document.getElementById('previewObraName').innerText = obraEl.value || 'Pintura Residencial Roma';
    if (clientEl) document.getElementById('previewClientName').innerText = clientEl.value || 'Jean C Cunha / Deziderio';
    if (contactEl) document.getElementById('previewClientContact').innerText = 'Contato: ' + (contactEl.value || 'Deziderio Pereira');
    if (docEl) document.getElementById('previewClientDocInfo').innerText = 'CNPJ/CPF: ' + (docEl.value || '30.654.467/0001-16');
    if (phoneEl) document.getElementById('previewClientPhone').innerText = 'Tel: ' + (phoneEl.value || '(17) 99283-5555');
    if (addressEl) document.getElementById('previewClientAddress').innerText = 'Local/Cidade: ' + (addressEl.value || 'Bady Bassitt - SP');
    
    const dateInput = document.getElementById('orcDate');
    if (dateInput && dateInput.value) {
        const [ano, mes, dia] = dateInput.value.split('-');
        const datePreview = document.getElementById('previewOrcDate');
        if (datePreview) datePreview.innerText = `Data: ${dia}/${mes}/${ano}`;
    }

    const footerClient = document.getElementById('footerClientName');
    if (footerClient && clientEl) footerClient.innerText = clientEl.value || 'Jean C Cunha / Deziderio';

    const notesInput = document.getElementById('notesInput');
    const notesEl = document.getElementById('previewNotesText');
    if (notesEl && notesInput) notesEl.innerText = notesInput.value;

    const imgLogoDoc = document.getElementById('imgLogoDocumento');
    const iconeLogoDoc = document.getElementById('iconePadraoLogo');
    if (configEmpresa.logo_url) {
        if (imgLogoDoc) { imgLogoDoc.src = configEmpresa.logo_url; imgLogoDoc.classList.remove('hidden'); }
        if (iconeLogoDoc) iconeLogoDoc.classList.add('hidden');
    } else {
        if (imgLogoDoc) imgLogoDoc.classList.add('hidden');
        if (iconeLogoDoc) iconeLogoDoc.classList.remove('hidden');
    }

    const imgQrDoc = document.getElementById('imgQrcodeDocumento');
    const iconeQrDoc = document.getElementById('qrcodeIconDefault');
    if (configEmpresa.qrcode_pix_url) {
        if (imgQrDoc) { imgQrDoc.src = configEmpresa.qrcode_pix_url; imgQrDoc.classList.remove('hidden'); }
        if (iconeQrDoc) iconeQrDoc.classList.add('hidden');
    } else {
        if (imgQrDoc) imgQrDoc.classList.add('hidden');
        if (iconeQrDoc) iconeQrDoc.classList.remove('hidden');
    }

    const tbody = document.getElementById('previewItensBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    items.forEach((i, idx) => {
        const tr = document.createElement('tr');
        const tot = (i.qty || 0) * (i.unitPrice || 0);
        tr.innerHTML = `
            <td class="py-1.5 px-2 font-bold text-slate-500">${idx + 1}</td>
            <td class="py-1.5 px-2 font-bold text-navy-900">${i.area}</td>
            <td class="py-1.5 px-2 font-medium text-slate-800">${i.description}</td>
            <td class="py-1.5 px-2 text-center text-slate-600">${i.unit}</td>
            <td class="py-1.5 px-2 text-center font-semibold">${i.qty.toLocaleString('pt-BR')}</td>
            <td class="py-1.5 px-2 text-right text-slate-600">${formatarMoeda(i.unitPrice)}</td>
            <td class="py-1.5 px-2 text-right font-bold text-navy-900 font-mono">${formatarMoeda(tot)}</td>
        `;
        tbody.appendChild(tr);
    });

    atualizarTotaisCalculados();
}

function salvarOrcamentoNoBanco() {
    executarSalvamentoAPI(() => {
        alert("✅ Orçamento salvo com sucesso!");
        fecharWizardVoltarLista();
    });
}

function salvarOrcamentoNoBancoSilencioso() {
    executarSalvamentoAPI(() => {
        fecharWizardVoltarLista();
    });
}

function executarSalvamentoAPI(callbackSucesso) {
    if (modoSomenteLeituraAprovado) { alert('Este orçamento está aprovado e não pode mais ser editado. Use apenas o campo de comentários.'); return; }
    const orcNumEl = document.getElementById('previewOrcNumber');
    const orcNum = orcNumEl ? orcNumEl.innerText : 'ORC-2026-0001';
    const statusEl = document.getElementById('orcStatusSelect');
    const statusAtual = statusEl ? statusEl.value : 'Enviado';

    const payload = {
        orc_number: orcNum,
        obra_name: document.getElementById('obraName')?.value || '',
        client_name: document.getElementById('clientName')?.value || '',
        client_contact: document.getElementById('clientContact')?.value || '',
        client_doc: document.getElementById('clientDoc')?.value || '',
        client_phone: document.getElementById('clientPhone')?.value || '',
        client_address: document.getElementById('clientAddress')?.value || '',
        orc_date: document.getElementById('orcDate')?.value || '',
        orc_medicao: document.getElementById('orcMedicao')?.value || '',
        payment_method: document.getElementById('paymentMethodSelect')?.value || 'PIX',
        pix_key: document.getElementById('pixKey')?.value || configEmpresa.pix_chave || '',
        discount: parseFloat(document.getElementById('discountInput')?.value) || 0,
        down_payment: parseFloat(document.getElementById('downPaymentPercent')?.value) || 50,
        subtotal: calcularSubtotal(),
        total_final: Math.max(0, calcularSubtotal() - (parseFloat(document.getElementById('discountInput')?.value) || 0)),
        notes: document.getElementById('notesInput')?.value || '',
        internal_notes: document.getElementById('internalNotesInput')?.value || '',
        items_json: JSON.stringify(items),
        status: statusAtual
    };

    fetch('/api/salvar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            if (typeof callbackSucesso === 'function') callbackSucesso();
        } else {
            alert("❌ Erro ao salvar: " + data.message);
        }
    })
    .catch(err => console.error("Erro na API de salvamento:", err));
}

function abrirModalHistorico() {
    fetch('/api/listar')
    .then(res => res.json())
    .then(data => {
        const tbody = document.getElementById('tabelaHistoricoBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-500 italic">Nenhum orçamento encontrado.</td></tr>`;
        } else {
            data.forEach(item => {
                const tr = document.createElement('tr');
                tr.className = "hover:bg-slate-50 dark:hover:bg-slate-800/50 transition";
                tr.innerHTML = `
                    <td class="p-3 font-mono font-bold text-gold-700 dark:text-gold-400">${item.orc_number}</td>
                    <td class="p-3 font-semibold text-slate-900 dark:text-white">${item.obra_name || '---'}</td>
                    <td class="p-3 text-slate-700 dark:text-slate-300">${item.client_name || '---'}</td>
                    <td class="p-3 text-right font-bold text-slate-900 dark:text-white font-mono">${formatarMoeda(item.total_final)}</td>
                    <td class="p-3 text-center text-slate-500 text-[11px]">
                        <span class="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-xl font-semibold">${item.status || 'Enviado'}</span>
                        <div class="text-[9px] text-slate-400 mt-0.5">${item.status_updated_at || item.created_at || '---'}</div>
                    </td>
                    <td class="p-3 text-center flex justify-center gap-1.5">
                        <button onclick="carregarOrcamentoParaEdicao('${item.orc_number}')" class="bg-gold-600 dark:bg-gold-500 hover:bg-gold-700 dark:hover:bg-gold-600 text-white dark:text-navy-950 font-bold px-3 py-1.5 rounded-xl text-[11px] transition shadow-sm">
                            <i class="fa-solid fa-folder-open"></i> Abrir
                        </button>
                        <button onclick="deletarOrcamentoComDuplaConfirmacao('${item.orc_number}')" class="bg-rose-500 hover:bg-rose-600 text-white font-bold px-2.5 py-1.5 rounded-xl text-[11px] transition shadow-sm">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        const modal = document.getElementById('historicoModal');
        if (modal) modal.classList.remove('hidden');
    })
    .catch(err => console.error("Erro ao listar histórico:", err));
}

function fecharModalHistorico() {
    const modal = document.getElementById('historicoModal');
    if (modal) modal.classList.add('hidden');
}

function carregarOrcamentoParaEdicao(orcNumber) {
    fecharModalHistorico();
    mudarAba('orcamentos');

    fetch(`/api/obter/${orcNumber}`)
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            const o = data.orcamento;
            orcamentoAtualNumero = o.orc_number;
            
            const disp1 = document.getElementById('orcNumberDisplay');
            const disp2 = document.getElementById('previewOrcNumber');
            if (disp1) disp1.innerText = o.orc_number;
            if (disp2) disp2.innerText = o.orc_number;

            if (document.getElementById('obraName')) document.getElementById('obraName').value = o.obra_name || '';
            if (document.getElementById('clientName')) document.getElementById('clientName').value = o.client_name || '';
            if (document.getElementById('clientContact')) document.getElementById('clientContact').value = o.client_contact || '';
            if (document.getElementById('clientDoc')) document.getElementById('clientDoc').value = o.client_doc || '';
            if (document.getElementById('clientPhone')) document.getElementById('clientPhone').value = o.client_phone || '';
            if (document.getElementById('clientAddress')) document.getElementById('clientAddress').value = o.client_address || '';
            if (o.orc_date && document.getElementById('orcDate')) document.getElementById('orcDate').value = o.orc_date;
            if (document.getElementById('orcMedicao')) document.getElementById('orcMedicao').value = o.orc_medicao || '';
            if (document.getElementById('paymentMethodSelect')) {
                document.getElementById('paymentMethodSelect').value = o.payment_method || 'PIX';
                tratarTrocaMetodoPagamento();
            }
            if (document.getElementById('pixKey')) document.getElementById('pixKey').value = o.pix_key || configEmpresa.pix_chave || '';
            if (document.getElementById('discountInput')) document.getElementById('discountInput').value = o.discount || 0;
            if (document.getElementById('downPaymentPercent')) document.getElementById('downPaymentPercent').value = o.down_payment || 50;
            if (document.getElementById('notesInput')) document.getElementById('notesInput').value = o.notes || configEmpresa.observacoes_padrao || '';
            
            if (document.getElementById('internalNotesInput')) document.getElementById('internalNotesInput').value = o.internal_notes || '';
            renderizarListaComentariosHistorico();

            if (document.getElementById('orcStatusSelect')) document.getElementById('orcStatusSelect').value = o.status || 'Enviado';
            aplicarModoSomenteLeituraAprovado(o.status === 'Aprovado');

            if (o.items_json) {
                try {
                    items = JSON.parse(o.items_json);
                    renderizarTabelaItensEditor();
                } catch(e) { console.error("Erro ao parsear itens:", e); }
            }

            const visaoLista = document.getElementById('visao-lista-orcamentos');
            const visaoWizard = document.getElementById('visao-wizard-orcamento');
            if (visaoLista) visaoLista.classList.add('hidden');
            if (visaoWizard) visaoWizard.classList.remove('hidden');

            irParaEtapa(4);
        } else {
            alert("❌ Erro ao carregar orçamento: " + data.message);
        }
    })
    .catch(err => console.error("Erro ao obter orçamento:", err));
}

function atualizarTabelaGeralOrcamentos() {
    fetch('/api/listar')
    .then(res => res.json())
    .then(data => {
        window.todosOrcamentosCache = data || [];
        renderizarListaTabelaOrcamentos(window.todosOrcamentosCache);
    })
    .catch(err => console.error("Erro ao listar orçamentos:", err));
}

function renderizarListaTabelaOrcamentos(lista) {
    const tbody = document.getElementById('tabelaGeralOrcamentosBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!lista || lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-slate-500 italic">Nenhum orçamento encontrado.</td></tr>`;
        return;
    }

    lista.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 dark:hover:bg-slate-800/40 transition border-b border-slate-200 dark:border-slate-800/60";
        
        tr.innerHTML = `
            <td class="py-3 px-3 font-mono font-bold text-gold-700 dark:text-gold-500">${item.orc_number}</td>
            <td class="py-3 px-3 font-semibold text-slate-900 dark:text-white">${item.obra_name || '---'}</td>
            <td class="py-3 px-3 text-slate-700 dark:text-slate-300">${item.client_name || '---'}</td>
            <td class="py-3 px-3 text-right font-bold text-slate-900 dark:text-white font-mono">${formatarMoeda(item.total_final)}</td>
            <td class="py-3 px-3 text-center">
                ${item.status === 'Aprovado'
                    ? '<span class="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 px-2.5 py-1.5 rounded-lg text-xs font-bold"><i class="fa-solid fa-lock"></i> Aprovado</span>'
                    : `<select onchange="alterarStatusRapido('${item.orc_number}', this.value)" class="bg-slate-100 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 outline-none cursor-pointer shadow-sm">
                        <option value="Enviado" ${item.status === 'Enviado' ? 'selected' : ''}>Enviado (Pendente)</option>
                        <option value="Em andamento" ${item.status === 'Em andamento' ? 'selected' : ''}>Em andamento</option>
                        <option value="Aprovado">Concluído / Aprovado</option>
                        <option value="Recusado" ${item.status === 'Recusado' ? 'selected' : ''}>Recusado</option>
                    </select>`}
                <div class="text-[9px] text-slate-400 mt-0.5">${item.status_updated_at || item.created_at || ''}</div>
            </td>
            <td class="py-3 px-3 text-center flex justify-center gap-1.5">
                <button onclick="carregarOrcamentoParaEdicao('${item.orc_number}')" class="bg-slate-100 dark:bg-slate-800 hover:bg-gold-600 hover:text-white text-slate-700 dark:text-slate-200 font-bold px-3 py-1.5 rounded-xl text-[11px] transition shadow-sm">
                    <i class="fa-solid fa-folder-open"></i> Abrir
                </button>
                <button onclick="deletarOrcamentoComDuplaConfirmacao('${item.orc_number}')" class="bg-rose-500 hover:bg-rose-600 text-white font-bold px-2.5 py-1.5 rounded-xl text-[11px] transition shadow-sm" title="Excluir">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filtrarTabelaGeralOrcamentos(termo) {
    if (!window.todosOrcamentosCache) return;
    const t = termo.toLowerCase();
    const filtrados = window.todosOrcamentosCache.filter(item => 
        (item.orc_number && item.orc_number.toLowerCase().includes(t)) ||
        (item.obra_name && item.obra_name.toLowerCase().includes(t)) ||
        (item.client_name && item.client_name.toLowerCase().includes(t))
    );
    renderizarListaTabelaOrcamentos(filtrados);
}

function toggleBlocoPendentes() {
    const container = document.getElementById('containerTabelaPendentes');
    const texto = document.getElementById('textoTogglePendentes');
    const icone = document.getElementById('iconeTogglePendentes');
    
    if (container.classList.contains('hidden')) {
        container.classList.remove('hidden');
        texto.innerText = 'Recolher';
        icone.className = 'fa-solid fa-chevron-up';
    } else {
        container.classList.add('hidden');
        texto.innerText = 'Expandir';
        icone.className = 'fa-solid fa-chevron-down';
    }
}

function atualizarBarraFunil(tipo, qtd, soma, max) {
    const valEl = document.getElementById(`bar-val-${tipo}`);
    const progEl = document.getElementById(`bar-prog-${tipo}`);
    if (valEl) valEl.innerText = `${qtd} (${formatarMoeda(soma)})`;
    if (progEl) {
        const pct = (qtd / max) * 100;
        progEl.style.width = `${pct}%`;
    }
}

function carregarResumoDashboard() {
    fetch('/api/listar')
    .then(res => res.json())
    .then(data => {
        if (!Array.isArray(data)) return;
        const periodo = document.getElementById('filtroPeriodoDashboard')?.value || 'ultimos_6';
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = hoje.getMonth();

        // KPIs operacionais refletem a carteira atual, sem desaparecer ao trocar o período do gráfico.
        const aprovados = data.filter(d => d.status === 'Aprovado');
        const pendentes = data.filter(d => d.status === 'Enviado');
        const andamento = data.filter(d => d.status === 'Em andamento');
        const recusados = data.filter(d => d.status === 'Recusado');
        const soma = lista => lista.reduce((acc, d) => acc + (Number(d.total_final) || 0), 0);
        const somaAprovado = soma(aprovados);
        const somaPendente = soma(pendentes);
        const somaAndamento = soma(andamento);
        const somaRecusado = soma(recusados);

        const setText = (id, value) => { const el = document.getElementById(id); if (el) el.innerText = value; };
        setText('dash-faturamento-total', formatarMoeda(somaAprovado));
        setText('dash-ticket-medio', formatarMoeda(aprovados.length ? somaAprovado / aprovados.length : 0));
        setText('dash-valor-pendente', formatarMoeda(somaPendente));
        setText('dash-valor-andamento', formatarMoeda(somaAndamento));
        setText('dash-count-aprovados', aprovados.length);
        setText('dash-count-pendente', pendentes.length);
        setText('dash-count-andamento', andamento.length);
        document.querySelectorAll('#dash-total-emitidos').forEach(el => el.innerText = data.length);

        const periodoData = data.filter(d => {
            const dt = String(d.created_at || '').slice(0, 10);
            if (periodo === 'ano_atual') return dt.startsWith(String(ano));
            if (periodo === 'todos') return true;
            const parsed = new Date(`${dt}T12:00:00`);
            if (!dt || Number.isNaN(parsed.getTime())) return false;
            const diff = (ano - parsed.getFullYear()) * 12 + (mes - parsed.getMonth());
            return diff >= 0 && diff < 6;
        });
        const aprovadosPeriodo = periodoData.filter(d => d.status === 'Aprovado').length;
        const decididosPeriodo = periodoData.filter(d => ['Aprovado', 'Recusado'].includes(d.status)).length;
        const conversao = decididosPeriodo ? (aprovadosPeriodo / decididosPeriodo) * 100 : 0;
        setText('dash-taxa-conversao', `${conversao.toFixed(1)}%`);

        const totalCarteira = data.length || 1;
        atualizarBarraFunil('aprovado', aprovados.length, somaAprovado, totalCarteira);
        atualizarBarraFunil('andamento', andamento.length, somaAndamento, totalCarteira);
        atualizarBarraFunil('enviado', pendentes.length, somaPendente, totalCarteira);
        atualizarBarraFunil('recusado', recusados.length, somaRecusado, totalCarteira);

        renderizarGraficoCarteira(data, periodo);
    })
    .catch(err => console.error('Erro ao carregar dashboard:', err));
}

function atualizarBarraFunil(tipo, qtd, valor, max) {
    const valEl = document.getElementById(`bar-val-${tipo}`);
    const progEl = document.getElementById(`bar-prog-${tipo}`);
    if (valEl) valEl.innerText = `${qtd} (${formatarMoeda(valor)})`;
    if (progEl) progEl.style.width = `${Math.min(100, (qtd / Math.max(max, 1)) * 100)}%`;
}

function renderizarGraficoCarteira(data, periodo = 'ultimos_6') {
    const container = document.getElementById('containerGraficoLinhas');
    if (!container) return;
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth();
    let meses = [];

    if (periodo === 'ano_atual') {
        meses = Array.from({ length: 12 }, (_, i) => new Date(anoAtual, i, 1));
    } else if (periodo === 'todos') {
        const chaves = [...new Set(data.map(d => String(d.created_at || '').slice(0, 7)).filter(k => /^\d{4}-\d{2}$/.test(k)))].sort();
        const ultimas = chaves.slice(-12);
        meses = ultimas.map(k => { const [a, m] = k.split('-').map(Number); return new Date(a, m - 1, 1); });
    } else {
        meses = Array.from({ length: 6 }, (_, i) => new Date(anoAtual, mesAtual - 5 + i, 1));
    }

    if (!meses.length) {
        container.innerHTML = '<p class="text-xs text-slate-500 italic">Ainda não há movimentação suficiente para o gráfico.</p>';
        return;
    }
    const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const statusDefs = [
        { key: 'Aprovado', label: 'Aprovado', color: '#10b981' },
        { key: 'Em andamento', label: 'Em andamento', color: '#6366f1' },
        { key: 'Enviado', label: 'Enviado', color: '#d4af37' },
        { key: 'Recusado', label: 'Recusado', color: '#f43f5e' }
    ];
    const grupos = meses.map(date => {
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const registros = data.filter(d => String(d.created_at || '').slice(0, 7) === key);
        const valores = {};
        statusDefs.forEach(s => valores[s.key] = registros.filter(d => d.status === s.key).reduce((acc, d) => acc + (Number(d.total_final) || 0), 0));
        return { key, label: `${nomes[date.getMonth()]}/${String(date.getFullYear()).slice(-2)}`, registros, valores, total: Object.values(valores).reduce((a, b) => a + b, 0) };
    });
    if (!grupos.some(g => g.registros.length > 0)) {
        container.innerHTML = '<p class="text-xs text-slate-500 italic">Nenhuma proposta emitida no período selecionado.</p>';
        const info = document.getElementById('chartInfoBox');
        if (info) info.textContent = 'Sem movimentação no período';
        return;
    }
    const maxVal = Math.max(...grupos.map(g => g.total), 1);
    const width = Math.max(container.clientWidth || 560, 320);
    const height = 220, left = 14, right = 14, top = 12, bottom = 34;
    const plotH = height - top - bottom;
    const slot = (width - left - right) / grupos.length;
    const barW = Math.min(42, slot * 0.58);
    const y = value => top + plotH - (value / maxVal) * plotH;
    let svg = `<svg class="w-full h-full" viewBox="0 0 ${width} ${height}" role="img" aria-label="Composição mensal dos orçamentos por status">`;
    [0, .5, 1].forEach(frac => {
        const yy = top + plotH * frac;
        svg += `<line x1="${left}" y1="${yy}" x2="${width-right}" y2="${yy}" stroke="currentColor" opacity=".12" stroke-dasharray="3 4"/>`;
    });
    grupos.forEach((g, i) => {
        const x = left + slot * i + (slot - barW) / 2;
        let acumulado = 0;
        statusDefs.forEach(s => {
            const val = g.valores[s.key];
            if (val <= 0) return;
            const yTop = y(acumulado + val);
            const yBottom = y(acumulado);
            const h = Math.max(1, yBottom - yTop);
            svg += `<rect x="${x}" y="${yTop}" width="${barW}" height="${h}" rx="2" fill="${s.color}" opacity=".95" />`;
            acumulado += val;
        });
        svg += `<rect x="${x-4}" y="${top}" width="${barW+8}" height="${plotH}" fill="transparent" style="cursor:pointer" onmouseenter="mostrarTooltipCarteira('${g.label}', ${JSON.stringify(g.valores).replace(/"/g, '&quot;')}, ${g.registros.length})" onmouseleave="esconderChartTooltip()" />`;
        svg += `<text x="${x + barW/2}" y="${height-10}" text-anchor="middle" font-size="10" fill="currentColor" opacity=".7">${g.label}</text>`;
    });
    svg += '</svg>';
    container.innerHTML = svg;
    const info = document.getElementById('chartInfoBox');
    if (info) info.textContent = 'Passe o mouse sobre uma coluna para ver os valores';
}

function mostrarTooltipCarteira(mes, valores, quantidade) {
    const info = document.getElementById('chartInfoBox');
    if (!info) return;
    const fmt = v => formatarMoeda(Number(v) || 0);
    info.innerHTML = `<strong>${mes} · ${quantidade} propostas</strong> &nbsp; <span class="text-emerald-500">Aprovado ${fmt(valores['Aprovado'])}</span> · <span class="text-indigo-400">Em andamento ${fmt(valores['Em andamento'])}</span> · <span class="text-gold-500">Enviado ${fmt(valores['Enviado'])}</span> · <span class="text-rose-500">Recusado ${fmt(valores['Recusado'])}</span>`;
}

function esconderChartTooltip() {
    const info = document.getElementById('chartInfoBox');
    if (info) info.textContent = 'Passe o mouse sobre uma coluna para ver os valores';
}


function filtrarIrParaOrcamentos(statusFiltro) {
    mudarAba('orcamentos');
    fecharWizardVoltarLista();

    setTimeout(() => {
        fetch('/api/listar')
        .then(res => res.json())
        .then(data => {
            if (!data) return;
            const filtrados = statusFiltro ? data.filter(d => d.status === statusFiltro) : data;
            renderizarTabelaGeralOrcamentos(filtrados);
        });
    }, 100);
}

function abrirGavetaDashboard(statusFiltro, tituloPersonalizado) {
    const drawer = document.getElementById('drawerDashboard');
    const panel = document.getElementById('drawerPanel');
    const titulo = document.getElementById('drawerTitulo');
    const conteudo = document.getElementById('drawerListaConteudo');
    const contador = document.getElementById('drawerTotalItens');
    if (!drawer || !panel || !conteudo) return;

    titulo.innerHTML = `<i class="fa-solid fa-filter text-gold-500"></i> ${tituloPersonalizado}`;
    conteudo.innerHTML = `<p class="text-xs text-slate-500 italic text-center py-10">Carregando...</p>`;
    
    drawer.classList.remove('hidden');
    setTimeout(() => {
        panel.classList.remove('translate-x-full');
        panel.classList.add('translate-x-0');
    }, 10);

    fetch('/api/listar')
    .then(res => res.json())
    .then(data => {
        if (!data) return;
        const filtrados = statusFiltro ? data.filter(d => d.status === statusFiltro) : data;
        contador.innerText = `${filtrados.length} itens encontrados`;

        if (filtrados.length === 0) {
            conteudo.innerHTML = `<p class="text-xs text-slate-500 italic text-center py-10">Nenhum orçamento encontrado com este status.</p>`;
            return;
        }

        conteudo.innerHTML = filtrados.map(d => `
            <div class="p-4 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs shadow-sm">
                <div class="space-y-1">
                    <div class="flex items-center gap-2">
                        <span class="font-mono font-bold text-gold-600">${d.orc_number}</span>
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${d.status === 'Aprovado' ? 'bg-emerald-500/10 text-emerald-500' : d.status === 'Em andamento' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-gold-500/10 text-gold-500'}">${d.status}</span>
                    </div>
                    <p class="font-bold text-slate-800 dark:text-slate-100">${d.obra_name || 'Sem Obra'}</p>
                    <p class="text-slate-400 text-[11px]">Cliente: ${d.client_name || '---'}</p>
                </div>
                <div class="text-right space-y-2">
                    <p class="font-mono font-extrabold text-slate-900 dark:text-white text-sm">${formatarMoeda(d.total_final)}</p>
                    <button onclick="fecharGavetaDashboard(); carregarOrcamentoParaEdicao('${d.orc_number}')" class="px-3 py-1.5 bg-gold-600 hover:bg-gold-700 text-slate-950 font-bold rounded-lg transition text-[11px]">
                        <i class="fa-solid fa-eye"></i> ${d.status === 'Aprovado' ? 'Visualizar' : 'Abrir'}
                    </button>
                </div>
            </div>
        `).join('');
    });
}

function fecharGavetaDashboard() {
    const drawer = document.getElementById('drawerDashboard');
    const panel = document.getElementById('drawerPanel');
    if (!drawer || !panel) return;

    panel.classList.remove('translate-x-0');
    panel.classList.add('translate-x-full');

    setTimeout(() => {
        drawer.classList.add('hidden');
    }, 300);
}