/* Agenda Digital - Firebase Authentication + Cloud Firestore
   Compatível com HTML/CSS/JS puro, sem npm e sem alterar as tags <script> existentes.
   Cole este arquivo como script.js no repositório LAURA.
*/
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC90WnvPP5llFBGwGmbrHIUbhLPTbU_Rjg",
  authDomain: "agenda-a8d79.firebaseapp.com",
  projectId: "agenda-a8d79",
  storageBucket: "agenda-a8d79.firebasestorage.app",
  messagingSenderId: "305074527245",
  appId: "1:305074527245:web:4503ff2f1a7008828c0944"
};

const EMAIL_AVISO = "alinesouzaa@prof.educacao.sp.gov.br";
const URL_EMAIL = "https://formsubmit.co/ajax/" + EMAIL_AVISO;

let firebaseServices;
const firebaseReady = (async () => {
  const [appSdk, authSdk, dbSdk] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js")
  ]);
  const app = appSdk.initializeApp(FIREBASE_CONFIG);
  firebaseServices = {
    auth: authSdk.getAuth(app),
    db: dbSdk.getFirestore(app),
    ...authSdk,
    ...dbSdk
  };
  return firebaseServices;
})();

function mostrarMensagem(texto, tipo) {
  const el = document.getElementById("mensagem");
  if (!el) {
    alert(texto);
    return;
  }
  el.textContent = texto;
  el.className = "mensagem " + (tipo || "");
}

function mensagemErroFirebase(error) {
  const codigos = {
    "auth/email-already-in-use": "Este e-mail já tem cadastro. Faça login.",
    "auth/invalid-email": "Digite um e-mail válido.",
    "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/user-not-found": "E-mail ou senha incorretos.",
    "auth/wrong-password": "E-mail ou senha incorretos.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco e tente novamente.",
    "permission-denied": "O Firebase bloqueou esta operação. Confira as regras do Firestore.",
    "unavailable": "Não foi possível conectar ao Firebase. Verifique sua internet e tente novamente."
  };
  return codigos[error?.code] || error?.message || "Ocorreu um erro. Tente novamente.";
}

/* Envia aviso por e-mail sem incluir senhas. O envio de e-mail é independente do banco. */
async function enviarAviso(assunto, dados) {
  try {
    await fetch(URL_EMAIL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(Object.assign({
        _subject: assunto,
        _template: "table",
        _captcha: "false"
      }, dados))
    });
  } catch (e) {
    console.warn("Não foi possível enviar o aviso por e-mail.", e);
  }
}

/* ---------- Cadastro ---------- */
async function fazerCadastro(event) {
  event.preventDefault();
  const botao = event.target.querySelector('button[type="submit"]');
  const tipo = document.getElementById("tipo").value;
  const nome = document.getElementById("nome").value.trim();
  const email = document.getElementById("identificacao").value.trim().toLowerCase();
  const senha = document.getElementById("senha").value;

  if (nome.split(/\s+/).filter(Boolean).length < 2) {
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
  if (!tipo) {
    mostrarMensagem("Selecione o tipo de usuário.", "erro");
    return;
  }

  if (botao) {
    botao.disabled = true;
    botao.textContent = "Criando conta...";
  }

  try {
    const f = await firebaseReady;
    const credencial = await f.createUserWithEmailAndPassword(f.auth, email, senha);
    await f.updateProfile(credencial.user, { displayName: nome });

    await f.setDoc(f.doc(f.db, "USUARIOS", credencial.user.uid), {
      uid: credencial.user.uid,
      nome,
      email,
      tipo,
      criadoEm: f.serverTimestamp()
    });

    await enviarAviso("Novo cadastro na Agenda Digital", {
      Tipo: tipo,
      Nome: nome,
      Email: email,
      Data: new Date().toLocaleString("pt-BR")
    });

    mostrarMensagem("Conta criada com sucesso! Indo para o login...", "sucesso");
    setTimeout(() => { window.location.href = "login.html"; }, 1200);
  } catch (error) {
    console.error(error);
    mostrarMensagem(mensagemErroFirebase(error), "erro");
  } finally {
    if (botao) {
      botao.disabled = false;
      botao.textContent = "Criar minha conta";
    }
  }
}

/* ---------- Login e sessão ---------- */
async function fazerLogin(event) {
  event.preventDefault();
  const campoUsuario = document.getElementById("loginUsuario");
  const email = campoUsuario.value.trim().toLowerCase();
  const senha = document.getElementById("loginSenha").value;
  const botao = event.target.querySelector('button[type="submit"]');

  if (botao) {
    botao.disabled = true;
    botao.textContent = "Entrando...";
  }

  try {
    const f = await firebaseReady;
    const credencial = await f.signInWithEmailAndPassword(f.auth, email, senha);
    const perfilRef = f.doc(f.db, "USUARIOS", credencial.user.uid);
    const perfilSnap = await f.getDoc(perfilRef);

    if (!perfilSnap.exists()) {
      await f.signOut(f.auth);
      throw new Error("Sua conta não possui um perfil de usuário. Entre em contato com a administração.");
    }

    window.location.href = "agenda.html";
  } catch (error) {
    console.error(error);
    mostrarMensagem(mensagemErroFirebase(error), "erro");
  } finally {
    if (botao) {
      botao.disabled = false;
      botao.textContent = "Entrar";
    }
  }
}

async function sair() {
  try {
    const f = await firebaseReady;
    await f.signOut(f.auth);
  } catch (error) {
    console.error(error);
  }
  window.location.href = "index.html";
}

/* ---------- Agenda ---------- */
const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

let mesAtual = new Date().getMonth();
let anoAtual = new Date().getFullYear();
let dataEscolhida = null;
let horarioEscolhido = null;
let perfilAtual = null;
let reservasAtuais = [];
let statusDia = null; // 'livre' ou 'lotado' para o dia selecionado

function formatarISO(ano, mes, dia) {
  return ano + "-" + String(mes + 1).padStart(2, "0") + "-" + String(dia).padStart(2, "0");
}

function formatarBR(iso) {
  const [a, m, d] = iso.split("-");
  return d + "/" + m + "/" + a;
}

function desenharCalendario() {
  const grade = document.getElementById("diasCalendario");
  const titulo = document.getElementById("mesAno");
  if (!grade || !titulo) return;

  titulo.textContent = MESES[mesAtual] + " " + anoAtual;
  grade.innerHTML = "";

  const hoje = new Date();
  const hojeISO = formatarISO(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const totalDias = new Date(anoAtual, mesAtual + 1, 0).getDate();
  const primeiro = new Date(anoAtual, mesAtual, 1).getDay();
  const vazios = (primeiro === 0 || primeiro === 6) ? 0 : primeiro - 1;

  for (let i = 0; i < vazios; i++) grade.appendChild(document.createElement("span"));

  for (let dia = 1; dia <= totalDias; dia++) {
    const diaSemana = new Date(anoAtual, mesAtual, dia).getDay();
    if (diaSemana === 0 || diaSemana === 6) continue;

    const iso = formatarISO(anoAtual, mesAtual, dia);
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "dia";
    botao.textContent = dia;

    // Dias passados ficam clicáveis só para consulta (ver o que foi usado ou não).
    if (iso < hojeISO) botao.classList.add("dia-passado");
    if (iso === hojeISO) botao.classList.add("dia-hoje");
    if (iso === dataEscolhida) {
      botao.classList.add("dia-selecionado");
      if (statusDia) botao.classList.add("dia-" + statusDia);
    }

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

async function escolherData(iso) {
  dataEscolhida = iso;
  horarioEscolhido = null;
  statusDia = null;
  const label = document.getElementById("dataSelecionada");
  if (label) label.textContent = "Data escolhida: " + formatarBR(iso);
  desenharCalendario();
  await atualizarHorarios();
}

async function atualizarHorarios() {
  const f = await firebaseReady;
  const container = document.getElementById("horarios");
  if (!container) return;

  let ocupacoes = [];
  try {
    if (dataEscolhida) {
      const q = f.query(
        f.collection(f.db, "OCUPACAO"),
        f.where("data", "==", dataEscolhida)
      );
      const snap = await f.getDocs(q);
      ocupacoes = snap.docs.map(d => d.data());
    }
  } catch (error) {
    console.error(error);
    mostrarMensagem("Não foi possível consultar os horários. Confira as regras do Firestore.", "erro");
    return;
  }

  const agora = new Date();
  const hojeISO = formatarISO(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const horaAgora = String(agora.getHours()).padStart(2, "0") + ":" + String(agora.getMinutes()).padStart(2, "0");
  let livres = 0;

  container.querySelectorAll("button").forEach(btn => {
    btn.classList.remove("selecionado", "ocupado", "livre", "nao-usado", "encerrado");
    btn.disabled = false;
    if (!dataEscolhida) return;

    const oc = ocupacoes.find(r => r.inicio === btn.dataset.inicio);
    const passou = dataEscolhida < hojeISO ||
      (dataEscolhida === hojeISO && btn.dataset.fim <= horaAgora);

    if (oc && oc.status === "nao_usou") {
      btn.classList.add("nao-usado");   // AMARELO: reservou e não usou
      btn.disabled = true;
    } else if (oc) {
      btn.classList.add("ocupado");     // VERMELHO: ocupado
      btn.disabled = true;
    } else if (passou) {
      btn.classList.add("encerrado");   // horário que já passou
      btn.disabled = true;
    } else {
      btn.classList.add("livre");       // VERDE: livre
      livres++;
    }
  });

  statusDia = dataEscolhida ? (livres > 0 ? "livre" : "lotado") : null;
  desenharCalendario();
}

function lerSelecionados() {
  return Array.from(document.querySelectorAll("#horarios button"))
    .filter(b => b.classList.contains("selecionado"))
    .map(b => ({ inicio: b.dataset.inicio, fim: b.dataset.fim }));
}

/* Os horários escolhidos precisam ser seguidos (sem "buracos" no meio). */
function selecaoSeguida() {
  const todos = Array.from(document.querySelectorAll("#horarios button"));
  const idx = todos.map((b, n) => b.classList.contains("selecionado") ? n : -1).filter(n => n >= 0);
  return idx.length <= 1 || (idx[idx.length - 1] - idx[0] + 1 === idx.length);
}

function selecionarHorario(btn) {
  if (!dataEscolhida) {
    alert("Escolha uma data no calendário primeiro.");
    return;
  }
  if (btn.disabled || btn.classList.contains("ocupado")) {
    alert("Este horário não está disponível. Escolha outro.");
    return;
  }
  btn.classList.toggle("selecionado");
  if (!selecaoSeguida()) {
    btn.classList.toggle("selecionado");
    alert("Escolha horários seguidos (um ao lado do outro).");
  }
}

function selecionarManha() {
  const botoes = Array.from(document.querySelectorAll("#horarios button"))
    .filter(b => b.dataset.inicio < "13:00");
  if (!dataEscolhida) return alert("Escolha uma data no calendário primeiro.");
  if (botoes.some(b => b.disabled)) {
    return alert("Nem todos os horários da manhã estão livres neste dia. Escolha os horários manualmente.");
  }
  document.querySelectorAll("#horarios button").forEach(b => b.classList.remove("selecionado"));
  botoes.forEach(b => b.classList.add("selecionado"));
}

function limparSelecao() {
  document.querySelectorAll("#horarios button").forEach(b => b.classList.remove("selecionado"));
}

function criarAtalhos() {
  const horarios = document.getElementById("horarios");
  if (!horarios || document.getElementById("atalhosHorarios")) return;
  const div = document.createElement("div");
  div.id = "atalhosHorarios";
  div.className = "atalhos-horarios";
  div.innerHTML =
    '<span>Clique em um ou mais horários seguidos, ou use:</span>' +
    '<button type="button" onclick="selecionarManha()">Manhã toda</button>' +
    '<button type="button" onclick="limparSelecao()">Limpar seleção</button>';
  horarios.parentNode.insertBefore(div, horarios);
}

async function confirmarReserva() {
  const f = await firebaseReady;
  const user = f.auth.currentUser;
  const turma = document.getElementById("turma").value;
  const laboratorio = document.getElementById("laboratorio").value;
  const motivo = document.getElementById("motivo").value.trim();
  const escolhidos = lerSelecionados();

  if (!user || !perfilAtual) {
    alert("Sua sessão expirou. Entre novamente.");
    window.location.href = "login.html";
    return;
  }
  if (!dataEscolhida) return alert("Escolha uma data.");
  if (escolhidos.length === 0) return alert("Escolha pelo menos um horário.");
  if (!selecaoSeguida()) return alert("Escolha horários seguidos.");
  const inicioGeral = escolhidos[0].inicio;
  const fimGeral = escolhidos[escolhidos.length - 1].fim;
  if (new Date(dataEscolhida + "T" + fimGeral) < new Date()) return alert("Este horário já passou.");
  if (!turma) return alert("Selecione a turma.");
  if (!motivo) return alert("Digite o motivo da reserva.");

  const botao = document.querySelector('#areaReserva button.botao');
  if (botao) { botao.disabled = true; botao.textContent = "Salvando reserva..."; }

  const ocupRefs = escolhidos.map(h =>
    f.doc(f.db, "OCUPACAO", dataEscolhida + "_" + h.inicio.replace(":", "-")));
  const reservaRef = f.doc(f.collection(f.db, "RESERVAS"));

  try {
    await f.runTransaction(f.db, async transaction => {
      const snaps = [];
      for (const ref of ocupRefs) snaps.push(await transaction.get(ref));
      if (snaps.some(sn => sn.exists())) throw new Error("SLOT_OCUPADO");

      escolhidos.forEach((h, n) => {
        transaction.set(ocupRefs[n], {
          uid: user.uid,
          data: dataEscolhida,
          inicio: h.inicio,
          fim: h.fim,
          laboratorio,
          criadoEm: f.serverTimestamp()
        });
      });

      transaction.set(reservaRef, {
        uid: user.uid,
        data: dataEscolhida,
        inicio: inicioGeral,
        fim: fimGeral,
        slots: escolhidos.map(h => h.inicio),
        turma,
        laboratorio,
        motivo,
        criadoEm: f.serverTimestamp()
      });
    });

    await enviarAviso("Nova reserva do laboratório - " + formatarBR(dataEscolhida), {
      Professor: perfilAtual.nome,
      Email: perfilAtual.email,
      Data: formatarBR(dataEscolhida),
      Horario: inicioGeral + " - " + fimGeral,
      Turma: turma,
      Laboratorio: laboratorio,
      Motivo: motivo
    });

    document.getElementById("motivo").value = "";
    document.getElementById("turma").value = "";
    await atualizarHorarios();
    await listarReservas();
    alert("Reserva confirmada!");
  } catch (error) {
    console.error(error);
    if (error.message === "SLOT_OCUPADO" || error.code === "already-exists") {
      alert("Um dos horários acabou de ser reservado. Escolha novamente.");
      await atualizarHorarios();
    } else {
      alert("Não foi possível salvar a reserva: " + mensagemErroFirebase(error));
    }
  } finally {
    if (botao) { botao.disabled = false; botao.textContent = "Confirmar reserva"; }
  }
}

async function cancelarReserva(id) {
  if (!confirm("Deseja cancelar esta reserva?")) return;
  const f = await firebaseReady;
  const user = f.auth.currentUser;
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const reservaRef = f.doc(f.db, "RESERVAS", id);
  try {
    await f.runTransaction(f.db, async transaction => {
      const reservaSnap = await transaction.get(reservaRef);
      if (!reservaSnap.exists()) throw new Error("RESERVA_NAO_ENCONTRADA");
      const reserva = reservaSnap.data();
      if (reserva.uid !== user.uid) throw new Error("SEM_PERMISSAO");

      const inicios = reserva.slots || [reserva.inicio];
      const refs = inicios.map(h => f.doc(f.db, "OCUPACAO", reserva.data + "_" + h.replace(":", "-")));
      const snaps = [];
      for (const ref of refs) snaps.push(await transaction.get(ref));

      transaction.delete(reservaRef);
      snaps.forEach((sn, n) => {
        if (sn.exists() && sn.data().uid === user.uid) transaction.delete(refs[n]);
      });
    });

    // A reserva já foi apagada; o aviso usa os dados guardados na lista carregada.
    const cancelada = reservasAtuais.find(r => r.id === id);
    if (cancelada) {
      await enviarAviso("Reserva CANCELADA - " + formatarBR(cancelada.data), {
        Professor: perfilAtual?.nome || "",
        Email: perfilAtual?.email || "",
        Data: formatarBR(cancelada.data),
        Horario: cancelada.inicio + " - " + cancelada.fim,
        Turma: cancelada.turma,
        Laboratorio: cancelada.laboratorio
      });
    }
    await atualizarHorarios();
    await listarReservas();
    alert("Reserva cancelada.");
  } catch (error) {
    console.error(error);
    alert("Não foi possível cancelar a reserva: " + mensagemErroFirebase(error));
  }
}

async function marcarNaoUsou(id) {
  if (!confirm("Confirmar que este horário foi reservado mas NÃO foi utilizado?")) return;
  const f = await firebaseReady;
  const user = f.auth.currentUser;
  if (!user) { window.location.href = "login.html"; return; }
  const reservaRef = f.doc(f.db, "RESERVAS", id);
  try {
    await f.runTransaction(f.db, async transaction => {
      const snap = await transaction.get(reservaRef);
      if (!snap.exists() || snap.data().uid !== user.uid) throw new Error("SEM_PERMISSAO");
      const r = snap.data();
      const inicios = r.slots || [r.inicio];
      const refs = inicios.map(h => f.doc(f.db, "OCUPACAO", r.data + "_" + h.replace(":", "-")));
      const snaps = [];
      for (const ref of refs) snaps.push(await transaction.get(ref));
      transaction.update(reservaRef, { status: "nao_usou" });
      snaps.forEach((sn, n) => {
        if (sn.exists() && sn.data().uid === user.uid) transaction.update(refs[n], { status: "nao_usou" });
      });
    });
    await atualizarHorarios();
    await listarReservas();
  } catch (error) {
    console.error(error);
    alert("Não foi possível marcar: " + mensagemErroFirebase(error));
  }
}

async function listarReservas() {
  const f = await firebaseReady;
  const user = f.auth.currentUser;
  const lista = document.getElementById("listaReservas");
  if (!lista || !user) return;

  try {
    const q = f.query(
      f.collection(f.db, "RESERVAS"),
      f.where("uid", "==", user.uid)
    );
    const snap = await f.getDocs(q);
    const minhas = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.data + a.inicio).localeCompare(b.data + b.inicio));
    reservasAtuais = minhas;

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
      detalhe.textContent = r.turma + " · " + r.laboratorio + " · " + r.motivo +
        (r.status === "nao_usou" ? " · NÃO UTILIZADA" : "");
      info.append(titulo, detalhe);

      const acoes = document.createElement("div");
      acoes.className = "reserva-acoes";
      const jaComecou = new Date(r.data + "T" + r.inicio) <= new Date();
      if (jaComecou && r.status !== "nao_usou") {
        const naoUsei = document.createElement("button");
        naoUsei.className = "botao-nao-usei";
        naoUsei.textContent = "Não utilizei";
        naoUsei.onclick = () => marcarNaoUsou(r.id);
        acoes.appendChild(naoUsei);
      }

      const cancelar = document.createElement("button");
      cancelar.className = "botao-cancelar";
      cancelar.textContent = "Cancelar";
      cancelar.onclick = () => cancelarReserva(r.id);

      acoes.appendChild(cancelar);
      item.append(info, acoes);
      lista.appendChild(item);
    });
  } catch (error) {
    console.error(error);
    lista.innerHTML = "<p>Não foi possível carregar suas reservas. Confira as regras do Firestore.</p>";
  }
}

/* ---------- Inicialização ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const f = await firebaseReady;

    if (document.getElementById("diasCalendario")) {
      f.onAuthStateChanged(f.auth, async user => {
        if (!user) {
          window.location.href = "login.html";
          return;
        }

        try {
          const perfilSnap = await f.getDoc(f.doc(f.db, "USUARIOS", user.uid));
          if (!perfilSnap.exists()) {
            await f.signOut(f.auth);
            window.location.href = "login.html";
            return;
          }

          perfilAtual = perfilSnap.data();
          document.getElementById("nomeUsuario").textContent = (perfilAtual.nome || user.displayName || "Professor").split(" ")[0];
          criarAtalhos();
          desenharCalendario();
          await atualizarHorarios();
          await listarReservas();
        } catch (error) {
          console.error(error);
          mostrarMensagem("Erro ao carregar sua conta no Firebase. Confira as regras do Firestore.", "erro");
        }
      });
    }
  } catch (error) {
    console.error("Falha ao iniciar Firebase:", error);
    mostrarMensagem("Não foi possível iniciar o Firebase. Confira a configuração e a conexão.", "erro");
  }
});

/* Mantém compatibilidade com os onclick e onsubmit que já existem nos HTML. */
Object.assign(window, {
  fazerCadastro,
  fazerLogin,
  sair,
  mesAnterior,
  proximoMes,
  escolherData,
  selecionarHorario,
  selecionarManha,
  limparSelecao,
  confirmarReserva,
  cancelarReserva,
  marcarNaoUsou,
  listarReservas,
  desenharCalendario,
  atualizarHorarios
});
