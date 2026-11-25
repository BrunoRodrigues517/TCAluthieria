import { supabase } from "./conexao.js";

const formatadorNota = new Intl.NumberFormat("pt-BR", {
	minimumFractionDigits: 1,
	maximumFractionDigits: 1
});

function obterCpfClienteLogado() {
	try {
		const cliente = JSON.parse(sessionStorage.getItem("clienteLogado") ?? "null");
		return cliente?.cpf ?? null;
	} catch (error) {
		console.error("Erro ao ler os dados da sessão:", error);
		return null;
	}
}

export async function carregarResenhas(instrumentosIds) {
	if (instrumentosIds.length === 0) {
		return new Map();
	}

	const { data, error } = await supabase
		.from("resenha")
		.select("autor, avaliado, nota, resenha")
		.in("avaliado", instrumentosIds);

	if (error) {
		throw error;
	}

	const resenhasPorInstrumento = new Map();
	for (const resenha of data ?? []) {
		const resenhas = resenhasPorInstrumento.get(resenha.avaliado) ?? [];
		resenhas.push(resenha);
		resenhasPorInstrumento.set(resenha.avaliado, resenhas);
	}

	return resenhasPorInstrumento;
}

function criarEstrelas(nota, rotulo) {
	const estrelas = document.createElement("span");
	estrelas.className = "avaliacoes-instrumento__estrelas";
	estrelas.style.setProperty("--nota-percentual", `${Math.max(0, Math.min(100, nota * 10))}%`);
	estrelas.setAttribute("role", "img");
	estrelas.setAttribute("aria-label", rotulo);
	return estrelas;
}

function mostrarResenhas(conteiner, resenhas) {
	conteiner.replaceChildren();

	if (resenhas.length === 0) {
		const vazio = document.createElement("p");
		vazio.className = "avaliacoes-instrumento__media";
		vazio.textContent = "Ainda não há avaliações para este instrumento.";
		conteiner.append(vazio);
		return;
	}

	const media = resenhas.reduce((total, item) => total + Number(item.nota), 0) / resenhas.length;
	const mediaArredondada = formatadorNota.format(media);
	const estrelasMedia = criarEstrelas(
		media,
		`${formatadorNota.format(media / 2)} de 5 estrelas`
	);

	const resumo = document.createElement("p");
	resumo.className = "avaliacoes-instrumento__media";
	const notaMedia = document.createElement("strong");
	notaMedia.textContent = `${mediaArredondada}/10 `;
	resumo.append(notaMedia, estrelasMedia, ` (${resenhas.length} avaliações)`);

	const lista = document.createElement("ul");
	lista.className = "avaliacoes-instrumento__lista";
	for (const resenha of resenhas) {
		const item = document.createElement("li");
		item.className = "avaliacoes-instrumento__item";

		const nota = document.createElement("strong");
		nota.textContent = `Nota ${resenha.nota}/10`;
		const estrelas = criarEstrelas(
			Number(resenha.nota),
			`Nota ${resenha.nota} de 10, ${formatadorNota.format(Number(resenha.nota) / 2)} de 5 estrelas`
		);
		const cabecalho = document.createElement("div");
		cabecalho.append(nota, " ", estrelas);
		item.append(cabecalho);

		if (resenha.resenha) {
			const texto = document.createElement("p");
			texto.textContent = resenha.resenha;
			item.append(texto);
		}

		lista.append(item);
	}

	conteiner.append(resumo, lista);
}

export function criarSecaoResenha(instrumentoId, resenhasIniciais, erroCarregamento = false) {
	const secao = document.createElement("section");
	secao.className = "avaliacoes-instrumento";

	const botaoAlternar = document.createElement("button");
	botaoAlternar.className = "formulario__botao avaliacoes-instrumento__alternar";
	botaoAlternar.type = "button";
	botaoAlternar.textContent = "Ver avaliações";
	botaoAlternar.setAttribute("aria-expanded", "false");

	const conteudo = document.createElement("div");
	conteudo.className = "avaliacoes-instrumento__conteudo";
	conteudo.id = `conteudo-avaliacoes-${instrumentoId}`;
	conteudo.hidden = true;
	botaoAlternar.setAttribute("aria-controls", conteudo.id);

	const titulo = document.createElement("h4");
	titulo.className = "avaliacoes-instrumento__titulo";
	titulo.textContent = "Avaliações";

	const listaResenhas = document.createElement("div");
	listaResenhas.setAttribute("aria-live", "polite");
	mostrarResenhas(listaResenhas, resenhasIniciais);

	const formulario = document.createElement("form");
	formulario.className = "avaliacoes-instrumento__formulario";

	const cpfCliente = obterCpfClienteLogado();
	let resenhas = [...resenhasIniciais];
	const resenhaDoCliente = resenhas.find((item) => item.autor === cpfCliente);
	const idNota = `nota-resenha-${instrumentoId}`;
	const campoNota = document.createElement("div");
	campoNota.className = "avaliacoes-instrumento__campo";

	const rotuloNota = document.createElement("label");
	rotuloNota.htmlFor = idNota;
	rotuloNota.textContent = "Nota (0 a 10)";

	const seletorNota = document.createElement("select");
	seletorNota.id = idNota;
	seletorNota.required = true;
	const opcaoInicial = document.createElement("option");
	opcaoInicial.value = "";
	opcaoInicial.textContent = "Selecione uma nota";
	seletorNota.append(opcaoInicial);
	for (let nota = 0; nota <= 10; nota += 1) {
		const opcao = document.createElement("option");
		opcao.value = String(nota);
		opcao.textContent = String(nota);
		seletorNota.append(opcao);
	}
	if (resenhaDoCliente) {
		seletorNota.value = String(resenhaDoCliente.nota);
	}
	campoNota.append(rotuloNota, seletorNota);

	const campoTexto = document.createElement("div");
	campoTexto.className = "avaliacoes-instrumento__campo";
	const idTexto = `texto-resenha-${instrumentoId}`;
	const rotuloTexto = document.createElement("label");
	rotuloTexto.htmlFor = idTexto;
	rotuloTexto.textContent = "Sua avaliação (opcional)";

	const textoResenha = document.createElement("textarea");
	textoResenha.id = idTexto;
	textoResenha.rows = 3;
	textoResenha.maxLength = 1000;
	textoResenha.value = resenhaDoCliente?.resenha ?? "";
	textoResenha.placeholder = "Conte sua experiência com este instrumento.";
	campoTexto.append(rotuloTexto, textoResenha);

	const botaoEnviar = document.createElement("button");
	botaoEnviar.className = "formulario__botao";
	botaoEnviar.type = "submit";
	botaoEnviar.textContent = resenhaDoCliente ? "Atualizar avaliação" : "Enviar avaliação";

	const botaoExcluir = document.createElement("button");
	botaoExcluir.className = "formulario__botao";
	botaoExcluir.type = "button";
	botaoExcluir.textContent = "Excluir minha avaliação";
	botaoExcluir.hidden = !resenhaDoCliente;

	const mensagem = document.createElement("p");
	mensagem.className = "avaliacoes-instrumento__mensagem";
	mensagem.setAttribute("role", "status");
	mensagem.setAttribute("aria-live", "polite");

	if (!cpfCliente) {
		formulario.hidden = true;
		mensagem.textContent = "Entre na sua conta para avaliar este instrumento.";
	} else if (erroCarregamento) {
		mensagem.textContent = "Não foi possível carregar as avaliações existentes.";
	}

	botaoExcluir.addEventListener("click", async () => {
		botaoExcluir.disabled = true;
		botaoEnviar.disabled = true;
		mensagem.textContent = "Excluindo sua avaliação...";
		try {
			const { error } = await supabase
				.from("resenha")
				.delete()
				.eq("autor", cpfCliente)
				.eq("avaliado", instrumentoId);

			if (error) {
				console.error("Erro ao excluir a avaliação:", error);
				mensagem.textContent = "Não foi possível excluir sua avaliação. Tente novamente.";
				return;
			}

			resenhas = resenhas.filter((item) => item.autor !== cpfCliente);
			mostrarResenhas(listaResenhas, resenhas);
			seletorNota.value = "";
			textoResenha.value = "";
			botaoEnviar.textContent = "Enviar avaliação";
			botaoExcluir.hidden = true;
			mensagem.textContent = "Sua avaliação foi excluída.";
		} catch (error) {
			console.error("Erro ao conectar com o Supabase:", error);
			mensagem.textContent = "Não foi possível conectar ao serviço. Tente novamente.";
		} finally {
			botaoExcluir.disabled = false;
			botaoEnviar.disabled = false;
		}
	});

	formulario.addEventListener("submit", async (evento) => {
		evento.preventDefault();
		const nota = Number(seletorNota.value);
		if (!Number.isInteger(nota) || nota < 0 || nota > 10) {
			mensagem.textContent = "Selecione uma nota entre 0 e 10.";
			return;
		}

		botaoEnviar.disabled = true;
		botaoExcluir.disabled = true;
		mensagem.textContent = "Salvando sua avaliação...";
		try {
			const avaliacao = {
				autor: cpfCliente,
				avaliado: instrumentoId,
				nota,
				resenha: textoResenha.value.trim() || null
			};
			const { error } = await supabase
				.from("resenha")
				.upsert(avaliacao, { onConflict: "autor,avaliado" });

			if (error) {
				console.error("Erro ao salvar a avaliação:", error);
				mensagem.textContent = "Não foi possível salvar sua avaliação. Tente novamente.";
				return;
			}

			const indiceExistente = resenhas.findIndex((item) => item.autor === cpfCliente);
			if (indiceExistente === -1) {
				resenhas.push(avaliacao);
			} else {
				resenhas[indiceExistente] = avaliacao;
			}
			mostrarResenhas(listaResenhas, resenhas);
			botaoEnviar.textContent = "Atualizar avaliação";
			botaoExcluir.hidden = false;
			mensagem.textContent = "Avaliação salva com sucesso!";
		} catch (error) {
			console.error("Erro ao conectar com o Supabase:", error);
			mensagem.textContent = "Não foi possível conectar ao serviço. Tente novamente.";
		} finally {
			botaoEnviar.disabled = false;
			botaoExcluir.disabled = false;
		}
	});

	botaoAlternar.addEventListener("click", () => {
		const aberto = conteudo.hidden;
		conteudo.hidden = !aberto;
		botaoAlternar.setAttribute("aria-expanded", String(aberto));
		botaoAlternar.textContent = aberto ? "Ocultar avaliações" : "Ver avaliações";
	});

	formulario.append(campoNota, campoTexto, botaoEnviar, botaoExcluir);
	conteudo.append(titulo, listaResenhas, formulario, mensagem);
	secao.append(botaoAlternar, conteudo);
	return secao;
}