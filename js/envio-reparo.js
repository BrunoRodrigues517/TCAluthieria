import { supabase } from "./conexao.js";

const formulario = document.querySelector("#form-envio-reparo");
const campoModelo = document.querySelector("#modelo-reparo");
const campoTipo = document.querySelector("#tipo-reparo");
const botaoEnviar = formulario.querySelector('button[type="submit"]');
const mensagem = document.querySelector("#mensagem-envio-reparo");
const textoClienteLogado = document.querySelector("#cliente-logado");
const mensagemInstrumentos = document.querySelector("#mensagem-instrumentos-reparo");
const listaInstrumentos = document.querySelector("#lista-instrumentos-reparo");

const formatadorPreco = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL"
});

let tiposReparo = [];

const estadosReparo = {
	"nao reparado": "Não reparado",
	"em conserto": "Em conserto",
	reparado: "Reparado"
};

function obterClienteLogado() {
	try {
		return JSON.parse(sessionStorage.getItem("clienteLogado") ?? "null");
	} catch (error) {
		console.error("Erro ao ler os dados da sessão:", error);
		return null;
	}
}

const clienteLogado = obterClienteLogado();
const cpfSessao = String(clienteLogado?.cpf ?? "").trim();
const cpfCliente = /^\d{11}$/.test(cpfSessao) ? cpfSessao : null;

async function carregarClienteLogado() {
	if (!clienteLogado?.email) {
		textoClienteLogado.textContent = "Você está logado como: cliente não identificado";
		return;
	}

	try {
		const { data, error } = await supabase
			.from("cliente")
			.select("nome")
			.eq("email", clienteLogado.email)
			.maybeSingle();

		if (error) {
			console.error("Erro ao buscar o nome do cliente:", error);
			textoClienteLogado.textContent = "Você está logado como: cliente não identificado";
			return;
		}

		textoClienteLogado.textContent = `Você está logado como: ${data?.nome ?? "cliente não identificado"}`;
	} catch (error) {
		console.error("Erro ao conectar com o Supabase:", error);
		textoClienteLogado.textContent = "Você está logado como: cliente não identificado";
	}
}

async function carregarTiposReparo() {
	if (!cpfCliente) {
		mensagem.textContent = "Faça login novamente para enviar um instrumento para reparo.";
		return;
	}

	mensagem.textContent = "Carregando tipos de instrumento...";

	try {
		const { data, error } = await supabase
			.from("tipo_instrumento_conserto")
			.select("id, nome")
			.order("id", { ascending: true });

		if (error) {
			console.error("Erro ao carregar os tipos de reparo:", error);
			mensagem.textContent = "Não foi possível carregar os tipos de instrumento.";
			return;
		}

		tiposReparo = data ?? [];
		const opcaoInicial = document.createElement("option");
		opcaoInicial.value = "";
		opcaoInicial.textContent = tiposReparo.length ? "Selecione um tipo" : "Nenhum tipo disponível";
		campoTipo.replaceChildren(
			opcaoInicial,
			...tiposReparo.map((tipo) => {
				const opcao = document.createElement("option");
				opcao.value = String(tipo.id);
				opcao.textContent = tipo.nome;
				return opcao;
			})
		);
		campoTipo.disabled = tiposReparo.length === 0;
		botaoEnviar.disabled = tiposReparo.length === 0;
		mensagem.textContent = "";
	} catch (error) {
		console.error("Erro ao conectar com o Supabase:", error);
		mensagem.textContent = "Não foi possível conectar ao serviço.";
	}
}

async function carregarInstrumentosCliente() {
	listaInstrumentos.replaceChildren();

	if (!cpfCliente) {
		mensagemInstrumentos.textContent = "Faça login novamente para visualizar seus instrumentos.";
		return;
	}

	mensagemInstrumentos.textContent = "Carregando seus instrumentos...";

	try {
		const { data, error } = await supabase
			.from("instrumento_conserto")
			.select("id, modelo, estado, tipo_instrumento_conserto(nome)")
			.eq("enviado_por", cpfCliente)
			.order("id", { ascending: false });

		if (error) {
			console.error("Erro ao carregar seus instrumentos para reparo:", error);
			mensagemInstrumentos.textContent = "Não foi possível carregar seus instrumentos.";
			return;
		}

		if (!data?.length) {
			mensagemInstrumentos.textContent = "Você ainda não enviou instrumentos para reparo.";
			return;
		}

		const { data: entregas, error: erroEntregas } = await supabase
			.from("entrega")
			.select("instrumento, preco_conserto")
			.eq("dono_instrumento", cpfCliente)
			.in("instrumento", data.map((instrumento) => instrumento.id))
			.order("id", { ascending: false });

		if (erroEntregas) {
			console.error("Erro ao carregar as devoluções dos instrumentos:", erroEntregas);
			mensagemInstrumentos.textContent = "Não foi possível carregar as informações de devolução.";
			return;
		}

		const entregasPorInstrumento = new Map();
		for (const entrega of entregas ?? []) {
			if (!entregasPorInstrumento.has(entrega.instrumento)) {
				entregasPorInstrumento.set(entrega.instrumento, entrega);
			}
		}

		const cartoes = data.map((instrumento) => {
			const cartao = document.createElement("li");
			cartao.className = "instrumento-card";

			const modelo = document.createElement("h3");
			modelo.className = "instrumento-card__modelo";
			modelo.textContent = instrumento.modelo;

			const tipo = document.createElement("p");
			tipo.className = "instrumento-card__tipo";
			tipo.textContent = `Tipo: ${instrumento.tipo_instrumento_conserto?.nome ?? "Não informado"}`;

			const estado = document.createElement("p");
			estado.className = "instrumento-card__estado";
			estado.textContent = `Estado: ${estadosReparo[instrumento.estado] ?? instrumento.estado}`;

			const entrega = entregasPorInstrumento.get(instrumento.id);
			const devolucao = document.createElement("p");
			devolucao.className = "instrumento-card__cliente";
			devolucao.textContent = `Devolução: ${entrega ? "Realizada" : "Pendente"}`;

			const preco = document.createElement("p");
			preco.className = "instrumento-card__cliente";
			preco.textContent = entrega
				? `Valor do reparo: ${formatadorPreco.format(Number(entrega.preco_conserto))}`
				: "Valor do reparo: Ainda não informado";

			cartao.append(modelo, tipo, estado, devolucao, preco);
			return cartao;
		});

		listaInstrumentos.replaceChildren(...cartoes);
		mensagemInstrumentos.textContent = "";
	} catch (error) {
		console.error("Erro ao conectar com o Supabase:", error);
		mensagemInstrumentos.textContent = "Não foi possível carregar seus instrumentos.";
	}
}

async function enviarInstrumentoParaReparo(evento) {
	evento.preventDefault();
	mensagem.textContent = "";

	const modelo = campoModelo.value.trim();
	const idTipoSelecionado = Number(campoTipo.value);
	const tipoSelecionado = tiposReparo.find((tipo) => Number(tipo.id) === idTipoSelecionado);

	if (!cpfCliente) {
		mensagem.textContent = "Faça login novamente para enviar um instrumento para reparo.";
		return;
	}

	if (!modelo || !tipoSelecionado) {
		mensagem.textContent = "Informe o modelo e selecione um tipo de instrumento.";
		return;
	}

	botaoEnviar.disabled = true;
	mensagem.textContent = "Registrando instrumento para reparo...";
	try {
		const { error } = await supabase
			.from("instrumento_conserto")
			.insert({
				modelo,
				estado: "nao reparado",
				enviado_por: cpfCliente,
				tipo_id: tipoSelecionado.id
			});

		if (error) {
			console.error("Erro ao registrar o instrumento para reparo:", error);
			mensagem.textContent = "Não foi possível registrar o instrumento para reparo.";
			return;
		}

		formulario.reset();
		mensagem.textContent = `O instrumento ${modelo} foi registrado para reparo.`;
		await carregarInstrumentosCliente();
	} catch (error) {
		console.error("Erro ao conectar com o Supabase:", error);
		mensagem.textContent = "Não foi possível conectar ao serviço.";
	} finally {
		botaoEnviar.disabled = false;
	}
}

formulario.addEventListener("submit", enviarInstrumentoParaReparo);
carregarClienteLogado();
carregarTiposReparo();
carregarInstrumentosCliente();