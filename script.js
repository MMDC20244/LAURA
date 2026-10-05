/* ===== Agenda Digital - script.js ===== */

const EMAIL_AVISO = "alinesouzaa@prof.educacao.sp.gov.br";
const URL_EMAIL = "https://formsubmit.co/ajax/" + EMAIL_AVISO;

/* ---------- Armazenamento (no navegador) ---------- */

function ler(chave, padrao) {
    try {
        const v = localStorage.getItem(chave);
        return v ? JSON.parse(v) : padrao;
    } catch (e) {
        return padrao;
    }
}

function gravar(chave, valor) {
    localStorage.setItem(chave, JSON.stringify(valor));
}

async function gerarHash(texto) {
    if (window.crypto && crypto.subtle) {
        const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
    }
    return texto;
}

function mostrarMensagem(texto, tipo) {
    const el = document.getElementById("mensagem");
    if (!el) { alert(texto); return; }
    el.textContent = texto;
    el.className = "mensagem " + tipo;
}

/* ---------- Cadastro ---------- */

async function fazerCadastro(event) {
    event.preventDefault();

    const tipo = document.getElementById("tipo").value;
    const nome = document.getElementById("nome").value.trim();
    const email = document.getElementById("identificacao").value.trim().toLowerCase();
    const senha = document.getElementById("senha").value;

    if (nome.split(" ").length < 2) {
        mostrarMensagem("Digite seu nome completo.", "erro");
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        mostrarMensagem("Digite um e-mail válido.", "erro");
        return;
    }
    if (senha.length < 6) {
        mostrarMensagem("A senha precisa ter pelo menos 6 caracteres.", "erro");
        return;
    }

    const usuarios = ler("usuarios", []);
    if (usuarios.some(u => u.email === email)) {
        mostrarMensagem("Este e-mail já tem cadastro. Faça login.", "erro");
        return;
    }

    const botao = event.target.querySelector("button[type=submit]");
    botao.disabled = true;
    botao.textContent = "Criando conta...";

    const dataCadastro = new Date().toLocaleString("pt-BR");

    usuarios.push({
        tipo: tipo,
        nome: nome,
        email: email,
        senha: await gerarHash(senha),
        criadoEm: dataCadastro
    });
    gravar("usuarios", usuarios);

    // Aviso por e-mail (a senha nunca é enviada)
    try {
        await fetch(URL_EMAIL, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({
                _subject: "Novo cadastro na Agenda Digital",
                _template: "table",
                _captcha: "false",
                Tipo: tipo,
                Nome: nome,
                Email: email,
                Data: dataCadastro
            })
        });
    } catch (e) {
        console.warn("Não foi possível enviar o aviso por e-mail.", e);
    }

    mostrarMensagem("Conta criada com sucesso! Indo para o login...", "sucesso");
    setTimeout(() => { window.location.href = "login.html"; }, 1500);
}

/* ---------- Login ---------- */

async function fazerLogin(event) {
    event.preventDefault();

    const usuario = document.getElementById("loginUsuario").value.trim().toLowerCase();
    const senha = await gerarHash(document.getElementById("loginSenha").value);

    const encontrado = ler("usuarios", []).find(u =>
        (u.email === usuario || (u.ra && u.ra.toLowerCase() === usuario)) && u.senha === senha
    );

    if (!encontrado) {
        mostrarMensagem("E-mail ou senha incorretos.", "erro");
        return;
    }

    gravar("usuarioLogado", { nome: encontrado.nome, email: encontrado.email });
    window.location.href = "agenda.html";
}

function sair() {
    localStorage.removeItem("usuarioLogado");
    window.location.href = "index.html";
}

/* ---------- Agenda ---------- */

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

let mesAtual = new Date().getMonth();
let anoAtual = new Date().getFullYear();
let dataEscolhida = null;   // formato AAAA-MM-DD
let horarioEscolhido = null; // { inicio, fim }

function formatarISO(ano, mes, dia) {
    return ano + "-" + String(mes + 1).padStart(2, "0") + "-" + String(dia).padStart(2, "0");
}

function formatarBR(iso) {
    const [a, m, d] = iso.split("-");
    return d + "/" + m + "/" + a;
}

function desenharCalendario() {
    const grade = document.getElementById("diasCalendario");
    document.getElementById("mesAno").textContent = MESES[mesAtual] + " " + anoAtual;
    grade.innerHTML = "";

    const hoje = new Date();
    const hojeISO = formatarISO(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const totalDias = new Date(anoAtual, mesAtual + 1, 0).getDate();

    // Quantos espaços vazios antes do dia 1 (colunas: SEG=0 ... SEX=4)
    const primeiro = new Date(anoAtual, mesAtual, 1).getDay(); // 0=dom
    let vazios = primeiro === 0 || primeiro === 6 ? 0 : primeiro - 1;
    for (let i = 0; i < vazios; i++) {
        grade.appendChild(document.createElement("span"));
    }

    for (let dia = 1; dia <= totalDias; dia++) {
        const diaSemana = new Date(anoAtual, mesAtual, dia).getDay();
        if (diaSemana === 0 || diaSemana === 6) continue; // só segunda a sexta

        const iso = formatarISO(anoAtual, mesAtual, dia);
        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "dia";
        botao.textContent = dia;

        if (iso < hojeISO) {
            botao.disabled = true;
            botao.classList.add("dia-passado");
        }
        if (iso === hojeISO) botao.classList.add("dia-hoje");
        if (iso === dataEscolhida) botao.classList.add("dia-selecionado");

        botao.onclick = () => escolherData(iso);
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

function escolherData(iso) {
    dataEscolhida = iso;
    horarioEscolhido = null;
    document.getElementById("dataSelecionada").textContent = "Data escolhida: " + formatarBR(iso);
    desenharCalendario();
    atualizarHorarios();
}

function atualizarHorarios() {
    const reservas = ler("reservas", []);
    document.querySelectorAll(".horarios button").forEach(btn => {
        btn.classList.remove("selecionado", "ocupado");
        btn.disabled = false;
        const ocupado = dataEscolhida && reservas.some(r =>
            r.data === dataEscolhida && r.inicio === btn.dataset.inicio
        );
        if (ocupado) {
            btn.classList.add("ocupado");
            btn.disabled = true;
        }
    });
}

function selecionarHorario(btn) {
    if (!dataEscolhida) {
        alert("Escolha uma data no calendário primeiro.");
        return;
    }
    document.querySelectorAll(".horarios button").forEach(b => b.classList.remove("selecionado"));
    btn.classList.add("selecionado");
    horarioEscolhido = { inicio: btn.dataset.inicio, fim: btn.dataset.fim };
}

function confirmarReserva() {
    const logado = ler("usuarioLogado", null);
    const turma = document.getElementById("turma").value;
    const laboratorio = document.getElementById("laboratorio").value;
    const motivo = document.getElementById("motivo").value.trim();

    if (!dataEscolhida) return alert("Escolha uma data.");
    if (!horarioEscolhido) return alert("Escolha um horário.");
    if (!turma) return alert("Selecione a turma.");
    if (!motivo) return alert("Digite o motivo da reserva.");

    const reservas = ler("reservas", []);
    if (reservas.some(r => r.data === dataEscolhida && r.inicio === horarioEscolhido.inicio)) {
        alert("Este horário acabou de ser reservado. Escolha outro.");
        atualizarHorarios();
        return;
    }

    reservas.push({
        id: Date.now(),
        email: logado.email,
        nome: logado.nome,
        data: dataEscolhida,
        inicio: horarioEscolhido.inicio,
        fim: horarioEscolhido.fim,
        turma: turma,
        laboratorio: laboratorio,
        motivo: motivo
    });
    gravar("reservas", reservas);

    document.getElementById("motivo").value = "";
    document.getElementById("turma").value = "";
    horarioEscolhido = null;
    atualizarHorarios();
    listarReservas();
    alert("Reserva confirmada!");
}

function cancelarReserva(id) {
    if (!confirm("Deseja cancelar esta reserva?")) return;
    gravar("reservas", ler("reservas", []).filter(r => r.id !== id));
    atualizarHorarios();
    listarReservas();
}

function listarReservas() {
    const logado = ler("usuarioLogado", null);
    const lista = document.getElementById("listaReservas");
    const minhas = ler("reservas", [])
        .filter(r => r.email === logado.email)
        .sort((a, b) => (a.data + a.inicio).localeCompare(b.data + b.inicio));

    if (minhas.length === 0) {
        lista.innerHTML = "<p>Você ainda não possui reservas.</p>";
        return;
    }

    lista.innerHTML = "";
    minhas.forEach(r => {
        const item = document.createElement("div");
        item.className = "reserva-item";

        const info = document.createElement("div");
        const titulo = document.createElement("strong");
        titulo.textContent = formatarBR(r.data) + " · " + r.inicio + " - " + r.fim;
        const detalhe = document.createElement("p");
        detalhe.textContent = r.turma + " · " + r.laboratorio + " · " + r.motivo;
        info.append(titulo, detalhe);

        const cancelar = document.createElement("button");
        cancelar.className = "botao-cancelar";
        cancelar.textContent = "Cancelar";
        cancelar.onclick = () => cancelarReserva(r.id);

        item.append(info, cancelar);
        lista.appendChild(item);
    });
}

/* ---------- Inicialização ---------- */

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("diasCalendario")) {
        const logado = ler("usuarioLogado", null);
        if (!logado) {
            window.location.href = "login.html";
            return;
        }
        document.getElementById("nomeUsuario").textContent = logado.nome.split(" ")[0];
        desenharCalendario();
        atualizarHorarios();
        listarReservas();
    }
});
