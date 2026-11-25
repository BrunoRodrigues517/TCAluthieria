import { supabase } from "./conexao.js";

const listaConsertos = document.querySelector("#lista-consertos");
const mensagemConsertos = document.querySelector("#mensagem-consertos");
const pesquisaCliente = document.querySelector("#pesquisa-conserto-cliente");
const filtroEstado = document.querySelector("#filtro-conserto-estado");
const listaEntregas = document.querySelector("#lista-entregas");
const mensagemEntregas = document.querySelector("#mensagem-entregas");

const formatadorPreco = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL"
});
const formatadorData = new Intl.DateTimeFormat("pt-BR", {
	dateStyle: "medium",
	timeZone: "UTC"
});

const estadosConserto = {
	"nao reparado": "Não reparado",
	"em conserto": "Em conserto",
	reparado: "Reparado"
};

let instrumentos = [];
let instrumentosEntregues = new Set();

function normalizarTexto(texto) {
	return texto
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLocaleLowerCase("pt-BR");
}

function filtrarInstrumentos() {
	const termoCliente = normalizarTexto(pesquisaCliente.value.trim());
	const termoCpf = pesquisaCliente.value.replace(/\D/g, "");
	const estadoSelecionado = filtroEstado.value;
	const resultados = instrumentos.filter((instrumento) => {
		const nomeCliente = normalizarTexto(instrumento.cliente?.nome ?? "");
		const cpfCliente = String(instrumento.enviado_por ?? "").trim();
		const correspondeCliente = nomeCliente.includes(termoCliente) ||
			Boolean(termoCpf && cpfCliente.includes(termoCpf));

		return correspondeCliente &&
			(!estadoSelecionado || instrumento.estado === estadoSelecionado);
	});

	mostrarInstrumentos(resultados);
}

function mostrarInstrumentos(resultados) {
	listaConsertos.replaceChildren();

	if (instrumentos.length === 0) {
		mensagemConsertos.textContent = "Nenhum instrumento enviado para conserto.";
		return;
	}

	if (resultados.length === 0) {
		mensagemConsertos.textContent = "Nenhum instrumento corresponde aos filtros.";
		return;
	}

	const cartoes = resultados.map((instrumento) => {
		const cartao = document.createElement("li");
		cartao.className = "instrumento-card";
		const instrumentoEntregue = instrumentosEntregues.has(Number(instrumento.id));

		const modelo = document.createElement("h3");
		modelo.className = "instrumento-card__modelo";
		modelo.textContent = instrumento.modelo;

		const tipo = document.createElement("p");
		tipo.className = "instrumento-card__tipo";
		tipo.textContent = `Tipo: ${instrumento.tipo_instrumento_conserto?.nome ?? "Não informado"}`;

		const cliente = document.createElement("p");
		cliente.className = "instrumento-card__cliente";
		cliente.textContent = `Cliente: ${instrumento.cliente?.nome ?? "Não identificado"}`;

		const campoEstado = document.createElement("div");
		campoEstado.className = "formulario__campo";
		const seletorEstado = document.createElement("select");
		seletorEstado.setAttribute("aria-label", `Estado de reparo de ${instrumento.modelo}`);
		for (const [valor, rotulo] of Object.entries(estadosConserto)) {
			const opcao = document.createElement("option");
			opcao.value = valor;
			opcao.textContent = rotulo;
			seletorEstado.append(opcao);
		}
		seletorEstado.value = instrumento.estado;
		seletorEstado.disabled = instrumentoEntregue;
		campoEstado.append(seletorEstado);

		const campoPreco = document.createElement("div");
		campoPreco.className = "formulario__campo";
		const rotuloPreco = document.createElement("label");
		rotuloPreco.textContent = "Preço do conserto (R$)";
		const entradaPreco = document.createElement("input");
		entradaPreco.type = "text";
		entradaPreco.inputMode = "decimal";
		entradaPreco.maxLength = 11;
		entradaPreco.placeholder = "Ex.: 150,00";
		entradaPreco.setAttribute("aria-label", `Preço do conserto de ${instrumento.modelo}`);
		entradaPreco.disabled = instrumento.estado !== "reparado" || instrumentoEntregue;
		rotuloPreco.htmlFor = `preco-conserto-${instrumento.id}`;
		entradaPreco.id = rotuloPreco.htmlFor;
		campoPreco.append(rotuloPreco, entradaPreco);

		const botaoEntrega = document.createElement("button");
		botaoEntrega.className = "formulario__botao";
		botaoEntrega.type = "button";
		botaoEntrega.textContent = instrumentoEntregue ? "Já enviado para entrega" : "Enviar para entrega";
		botaoEntrega.disabled = instrumento.estado !== "reparado" || instrumentoEntregue;

		const mensagemCartao = document.createElement("p");
		mensagemCartao.className = "instrumento-card__cliente";
		mensagemCartao.setAttribute("role", "status");
		mensagemCartao.setAttribute("aria-live", "polite");

		seletorEstado.addEventListener("change", () => atualizarEstado(
			instrumento,
			seletorEstado,
			entradaPreco,
			botaoEntrega,
			mensagemCartao
		));
		botaoEntrega.addEventListener("click", () => enviarParaEntrega(
			instrumento,
			entradaPreco,
			seletorEstado,
			botaoEntrega,
			mensagemCartao
		));

		cartao.append(modelo, tipo, cliente, campoEstado, campoPreco, botaoEntrega, mensagemCartao);
		return cartao;
	});

	listaConsertos.replaceChildren(...cartoes);
	mensagemConsertos.textContent = "";
}

async function atualizarEstado(instrumento, seletorEstado, entradaPreco, botaoEntrega, mensagemCartao) {
	const estadoAnterior = instrumento.estado;
	const novoEstado = seletorEstado.value;
	seletorEstado.disabled = true;
	botaoEntrega.disabled = true;
	mensagemCartao.textContent = "Atualizando estado...";

	try {
		const { data, error } = await supabase
			.from("instrumento_conserto")
			.update({ estado: novoEstado })
			.eq("id", instrumento.id)
			.select("id, estado")
			.maybeSingle();

		if (error) {
			console.error("Erro ao atualizar o estado do reparo:", error);
			seletorEstado.value = estadoAnterior;
			mensagemCartao.textContent = "Não foi possível atualizar o estado do reparo.";
			return;
		}

		if (!data) {
			seletorEstado.value = estadoAnterior;
			mensagemCartao.textContent = "O instrumento não foi encontrado para atualização.";
			return;
		}

		instrumento.estado = data.estado;
		entradaPreco.disabled = data.estado !== "reparado";
		botaoEntrega.disabled = data.estado !== "reparado";
		mensagemCartao.textContent = "Estado do reparo atualizado.";
		if (filtroEstado.value && filtroEstado.value !== data.estado) {
			filtrarInstrumentos();
		}
	} catch (error) {
		console.error("Erro ao conectar com o Supabase:", error);
		seletorEstado.value = estadoAnterior;
		mensagemCartao.textContent = "Não foi possível conectar ao serviço.";
	} finally {
		seletorEstado.disabled = instrumentosEntregues.has(Number(instrumento.id));
	}
}

async function enviarParaEntrega(instrumento, entradaPreco, seletorEstado, botaoEntrega, mensagemCartao) {
	const precoTexto = entradaPreco.value.trim().replace(",", ".");
	if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(precoTexto)) {
		mensagemCartao.textContent = "Informe um preço válido, com até duas casas decimais.";
		entradaPreco.focus();
		return;
	}

	if (instrumento.estado !== "reparado") {
		mensagemCartao.textContent = "Altere o estado para “Reparado” antes de enviar para entrega.";
		return;
	}

	const instrumentoId = Number(instrumento.id);
	botaoEntrega.disabled = true;
	entradaPreco.disabled = true;
	mensagemCartao.textContent = "Registrando a entrega...";

	try {
		const { error } = await supabase
			.from("entrega")
			.insert({
				instrumento: instrumentoId,
				dono_instrumento: instrumento.enviado_por,
				preco_conserto: Number(precoTexto)
			});

		if (error) {
			console.error("Erro ao registrar a entrega:", error);
			mensagemCartao.textContent = "Não foi possível enviar o instrumento para entrega.";
			return;
		}

		instrumentosEntregues.add(instrumentoId);
		seletorEstado.disabled = true;
		mensagemCartao.textContent = "Instrumento registrado na tabela de entregas.";
		botaoEntrega.textContent = "Já enviado para entrega";
	} catch (error) {
		console.error("Erro ao conectar com o Supabase:", error);
		mensagemCartao.textContent = "Não foi possível conectar ao serviço.";
	} finally {
		const instrumentoEntregue = instrumentosEntregues.has(instrumentoId);
		botaoEntrega.disabled = instrumentoEntregue || instrumento.estado !== "reparado";
		entradaPreco.disabled = instrumentoEntregue || instrumento.estado !== "reparado";
	}
}

async function carregarInstrumentos() {
	mensagemConsertos.textContent = "Carregando instrumentos...";

	try {
		const { data, error } = await supabase
			.from("instrumento_conserto")
			.select("id, modelo, estado, enviado_por, cliente(nome), tipo_instrumento_conserto(nome)")
			.order("id", { ascending: false });

		if (error) {
			console.error("Erro ao carregar os instrumentos para conserto:", error);
			mensagemConsertos.textContent = "Não foi possível carregar os instrumentos para conserto.";
			return;
		}

		instrumentos = data ?? [];
		instrumentosEntregues = new Set();
		if (instrumentos.length > 0) {
			const { data: entregas, error: erroEntregas } = await supabase
				.from("entrega")
				.select("instrumento")
				.in("instrumento", instrumentos.map((instrumento) => instrumento.id));

			if (erroEntregas) {
				console.error("Erro ao consultar as entregas existentes:", erroEntregas);
				mensagemConsertos.textContent = "Não foi possível verificar as entregas existentes.";
				return;
			}

			instrumentosEntregues = new Set(
				(entregas ?? []).map((entrega) => Number(entrega.instrumento))
			);
		}
		filtrarInstrumentos();
	} catch (error) {
		console.error("Erro ao conectar com o Supabase:", error);
		mensagemConsertos.textContent = "Não foi possível conectar ao serviço.";
	}
}

function formatarDataBanco(data) {
	const [ano, mes, dia] = data.split("-").map(Number);
	return new Date(Date.UTC(ano, mes - 1, dia));
}

function formatarDataIso(data) {
	return [
		data.getFullYear(),
		String(data.getMonth() + 1).padStart(2, "0"),
		String(data.getDate()).padStart(2, "0")
	].join("-");
}

async function carregarEntregasRecentes() {
	mensagemEntregas.textContent = "Carregando instrumentos devolvidos...";

	const hoje = new Date();
	const dataInicial = new Date(hoje);
	dataInicial.setDate(dataInicial.getDate() - 30);

	try {
		const { data, error } = await supabase
			.from("entrega")
			.select("id, instrumento, data_entrega, dono_instrumento, preco_conserto, cliente(nome), instrumento_conserto(modelo, estado, tipo_instrumento_conserto(nome))")
			.gte("data_entrega", formatarDataIso(dataInicial))
			.lte("data_entrega", formatarDataIso(hoje))
			.order("data_entrega", { ascending: false });

		if (error) {
			console.error("Erro ao carregar os instrumentos devolvidos:", error);
			mensagemEntregas.textContent = "Não foi possível carregar os instrumentos devolvidos.";
			return;
		}

		if (!data?.length) {
			listaEntregas.replaceChildren();
			mensagemEntregas.textContent = "Nenhum instrumento foi devolvido nos últimos 30 dias.";
			return;
		}

		const cartoes = data.map((entrega) => {
			const cartao = document.createElement("li");
			cartao.className = "instrumento-card";

			const modelo = document.createElement("h3");
			modelo.className = "instrumento-card__modelo";
			modelo.textContent = entrega.instrumento_conserto?.modelo ?? "Instrumento não identificado";

			const tipo = document.createElement("p");
			tipo.className = "instrumento-card__tipo";
			tipo.textContent = `Tipo: ${entrega.instrumento_conserto?.tipo_instrumento_conserto?.nome ?? "Não informado"}`;

			const cliente = document.createElement("p");
			cliente.className = "instrumento-card__cliente";
			cliente.textContent = `Cliente: ${entrega.cliente?.nome ?? "Não identificado"}`;

			const estado = document.createElement("p");
			estado.className = "instrumento-card__estado";
			estado.textContent = `Estado: ${estadosConserto[entrega.instrumento_conserto?.estado] ?? "Não informado"}`;

			const dataEntrega = document.createElement("p");
			dataEntrega.className = "instrumento-card__cliente";
			dataEntrega.textContent = `Data da entrega: ${formatadorData.format(formatarDataBanco(entrega.data_entrega))}`;

			const preco = document.createElement("p");
			preco.className = "instrumento-card__cliente";
			preco.textContent = `Preço do conserto: ${formatadorPreco.format(Number(entrega.preco_conserto))}`;

			cartao.append(modelo, tipo, cliente, estado, dataEntrega, preco);
			return cartao;
		});

		listaEntregas.replaceChildren(...cartoes);
		mensagemEntregas.textContent = "";
	} catch (error) {
		console.error("Erro ao conectar com o Supabase:", error);
		mensagemEntregas.textContent = "Não foi possível conectar ao serviço.";
	}
}

pesquisaCliente.addEventListener("input", filtrarInstrumentos);
filtroEstado.addEventListener("change", filtrarInstrumentos);
carregarInstrumentos();
carregarEntregasRecentes();
