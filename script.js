/* ===== Utilidades ===== */
const NOMES_MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function mostrarMensagem(texto, tipo = 'erro') {
    const el = document.getElementById('mensagem');
    if (!el) return alert(texto);
    el.textContent = texto;
    el.className = 'mensagem ' + tipo;
}

async function api(caminho, opcoes = {}) {
    const token = localStorage.getItem('token');
    const resposta = await fetch('/api/' + caminho, {
        ...opcoes,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
    });
    const dados = await resposta.json().catch(() => ({}));
    if (resposta.status === 401 && document.getElementById('areaReserva')) sair();
    if (!resposta.ok) throw new Error(dados.erro || 'Algo deu errado. Tente novamente.');
    return dados;
}

function formatarData(iso) {
    const [a, m, d] = iso.split('-');
    return `${d}/${m}/${a}`;
}

/* ===== Cadastro e login ===== */
async function fazerCadastro(evento) {
    evento.preventDefault();
    const botao = evento.target.querySelector('button[type=submit]');
    botao.disabled = true;
    try {
        await api('cadastro', {
            method: 'POST',
            body: JSON.stringify({
                tipo: document.getElementById('tipo').value,
                nome: document.getElementById('nome').value,
                email: document.getElementById('email').value,
                senha: document.getElementById('senha').value,
            }),
        });
        mostrarMensagem('Conta criada! Redirecionando para o login...', 'ok');
        setTimeout(() => (location.href = 'login.html'), 1200);
    } catch (e) {
        mostrarMensagem(e.message);
        botao.disabled = false;
    }
}

async function fazerLogin(evento) {
    evento.preventDefault();
    const botao = evento.target.querySelector('button[type=submit]');
    botao.disabled = true;
    try {
        const dados = await api('login', {
            method: 'POST',
            body: JSON.stringify({
                email: document.getElementById('loginUsuario').value,
                senha: document.getElementById('loginSenha').value,
            }),
        });
        localStorage.setItem('token', dados.token);
        localStorage.setItem('nome', dados.nome);
        location.href = 'agenda.html';
    } catch (e) {
        mostrarMensagem(e.message);
        botao.disabled = false;
    }
}

function sair() {
    localStorage.removeItem('token');
    localStorage.removeItem('nome');
    location.href = 'login.html';
}

/* ===== Agenda ===== */
let mesAtual = new Date().getMonth();
let anoAtual = new Date().getFullYear();
let dataEscolhida = null;
let horarioEscolhido = null;

function hojeISO() {
    const h = new Date();
    return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`;
}

function desenharCalendario() {
    document.getElementById('mesAno').textContent = `${NOMES_MESES[mesAtual]} ${anoAtual}`;
    const grade = document.getElementById('diasCalendario');
    grade.innerHTML = '';
    const hoje = hojeISO();
    const total = new Date(anoAtual, mesAtual + 1, 0).getDate();
    let primeiro = true;

    for (let d = 1; d <= total; d++) {
        const data = new Date(anoAtual, mesAtual, d);
        const diaSemana = data.getDay(); // 0 = domingo, 6 = sábado
        if (diaSemana === 0 || diaSemana === 6) continue;

        if (primeiro) {
            for (let i = 0; i < diaSemana - 1; i++) {
                const vazio = document.createElement('button');
                vazio.className = 'dia vazio';
                vazio.disabled = true;
                grade.appendChild(vazio);
            }
            primeiro = false;
        }

        const iso = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const botao = document.createElement('button');
        botao.type = 'button';
        botao.className = 'dia';
        botao.textContent = d;
        if (iso < hoje) botao.disabled = true;
        if (iso === hoje) botao.classList.add('hoje');
        if (iso === dataEscolhida) botao.classList.add('selecionado');
        botao.onclick = () => selecionarData(iso);
        grade.appendChild(botao);
    }
}

function mesAnterior() {
    mesAtual--;
    if (mesAtual < 0) { mesAtual = 11; anoAtual--; }
    desenharCalendario();
}

function proximoMes() {
    mesAtual++;
    if (mesAtual > 11) { mesAtual = 0; anoAtual++; }
    desenharCalendario();
}

async function selecionarData(iso) {
    dataEscolhida = iso;
    horarioEscolhido = null;
    desenharCalendario();
    document.getElementById('dataSelecionada').textContent = 'Horários para ' + formatarData(iso);
    document.getElementById('areaReserva').classList.remove('bloqueada');

    const botoes = document.querySelectorAll('#horarios button');
    botoes.forEach(b => { b.disabled = false; b.classList.remove('selecionado'); });
    try {
        const { ocupados } = await api('reservas?data=' + iso);
        botoes.forEach(b => { if (ocupados.includes(b.dataset.inicio)) b.disabled = true; });
    } catch (e) {
        mostrarMensagem(e.message);
    }
    document.getElementById('areaReserva').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function selecionarHorario(botao) {
    document.querySelectorAll('#horarios button').forEach(b => b.classList.remove('selecionado'));
    botao.classList.add('selecionado');
    horarioEscolhido = { inicio: botao.dataset.inicio, fim: botao.dataset.fim };
}

async function confirmarReserva() {
    const turma = document.getElementById('turma').value;
    const motivo = document.getElementById('motivo').value.trim();
    if (!dataEscolhida) return mostrarMensagem('Selecione uma data no calendário.');
    if (!horarioEscolhido) return mostrarMensagem('Selecione um horário.');
    if (!turma) return mostrarMensagem('Selecione a turma.');
    if (!motivo) return mostrarMensagem('Informe o motivo da reserva.');

    try {
        await api('reservas', {
            method: 'POST',
            body: JSON.stringify({
                data: dataEscolhida,
                inicio: horarioEscolhido.inicio,
                fim: horarioEscolhido.fim,
                turma,
                laboratorio: document.getElementById('laboratorio').value,
                motivo,
            }),
        });
        mostrarMensagem('Reserva confirmada!', 'ok');
        document.getElementById('motivo').value = '';
        await selecionarData(dataEscolhida);
        carregarReservas();
    } catch (e) {
        mostrarMensagem(e.message);
        if (dataEscolhida) selecionarData(dataEscolhida);
    }
}

async function carregarReservas() {
    const lista = document.getElementById('listaReservas');
    try {
        const { reservas } = await api('reservas');
        if (!reservas.length) {
            lista.innerHTML = '<p>Você ainda não tem reservas.</p>';
            return;
        }
        lista.innerHTML = '';
        reservas.forEach(r => {
            const item = document.createElement('div');
            item.className = 'reserva-item';
            const info = document.createElement('div');
            const titulo = document.createElement('strong');
            titulo.textContent = `${formatarData(r.data)} · ${r.inicio.slice(0, 5)} - ${r.fim.slice(0, 5)}`;
            const detalhe = document.createElement('span');
            detalhe.textContent = `${r.turma} · ${r.laboratorio} · ${r.motivo}`;
            info.append(titulo, detalhe);

            const cancelar = document.createElement('button');
            cancelar.className = 'cancelar';
            cancelar.textContent = 'Cancelar';
            cancelar.onclick = () => cancelarReserva(r.id);

            item.append(info, cancelar);
            lista.appendChild(item);
        });
    } catch (e) {
        lista.innerHTML = '<p>Não foi possível carregar suas reservas.</p>';
    }
}

async function cancelarReserva(id) {
    if (!confirm('Cancelar esta reserva?')) return;
    try {
        await api('reservas?id=' + id, { method: 'DELETE' });
        carregarReservas();
        if (dataEscolhida) selecionarData(dataEscolhida);
    } catch (e) {
        mostrarMensagem(e.message);
    }
}

/* ===== Inicialização da página da agenda ===== */
if (document.getElementById('areaReserva')) {
    if (!localStorage.getItem('token')) {
        location.href = 'login.html';
    } else {
        document.getElementById('nomeUsuario').textContent = localStorage.getItem('nome') || 'professor(a)';
        document.getElementById('areaReserva').classList.add('bloqueada');
        desenharCalendario();
        carregarReservas();
    }
}
