import { supabase } from "./conexao.js";
import { carregarResenhas, criarSecaoResenha } from "./resenha.js";

const listaInstrumentos = document.querySelector("#lista-instrumentos");
const mensagemEstoque = document.querySelector("#mensagem-estoque");
const navegacaoPaginacao = document.querySelector(".paginacao-estoque");
const botaoAnterior = document.querySelector("#pagina-anterior");
const botaoSeguinte = document.querySelector("#pagina-seguinte");
const indicadorPagina = document.querySelector("#indicador-pagina");
const listaCarrinho = document.querySelector("#lista-carrinho");
const mensagemCarrinho = document.querySelector("#mensagem-carrinho");
const resumoCarrinho = document.querySelector("#resumo-carrinho");
const totalCarrinho = document.querySelector("#total-carrinho");
const botaoFinalizarCompra = document.querySelector("#finalizar-compra");
const mensagemCompra = document.querySelector("#mensagem-compra");
const textoClienteLogado = document.querySelector("#cliente-logado");
const telaHorizontal = window.matchMedia("(orientation: landscape)");

const formatadorPreco = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL"
});

let instrumentos = [];
let paginaAtual = 1;
let resenhasPorInstrumento = new Map();
let erroAoCarregarResenhas = false;
const chaveCarrinho = "carrinho-instrumentos";
const opcoesPagamento = ["a vista", "2x", "4x", "6x", "8x"];

async function carregarClienteLogado() {
	let cliente;

	try {
		cliente = JSON.parse(sessionStorage.getItem("clienteLogado") ?? "null");
	} catch (error) {
		console.error("Erro ao ler os dados da sessão:", error);
	}

	if (!cliente?.email) {
		textoClienteLogado.textContent = "Você está logado como: cliente não identificado";
		return;
	}

	const { data, error } = await supabase
		.from("cliente")
		.select("nome")
		.eq("email", cliente.email)
		.maybeSingle();

	if (error) {
		console.error("Erro ao buscar o nome do cliente:", error);
		textoClienteLogado.textContent = "Você está logado como: cliente não identificado";
		return;
	}

	textoClienteLogado.textContent = `Você está logado como: ${data?.nome ?? "cliente não identificado"}`;
}

function obterCarrinho() {
	try {
		const carrinho = JSON.parse(localStorage.getItem(chaveCarrinho) ?? "[]");
		return Array.isArray(carrinho) ? carrinho : [];
	} catch (error) {
		console.error("Erro ao ler o carrinho:", error);
		return [];
	}
}

function salvarCarrinho(carrinho) {
	try {
		localStorage.setItem(chaveCarrinho, JSON.stringify(carrinho));
		return true;
	} catch (error) {
		console.error("Erro ao salvar o carrinho:", error);
		return false;
	}
}

function adicionarAoCarrinho(instrumento) {
	const carrinho = obterCarrinho();
	const itemExistente = carrinho.find((item) => item.id === instrumento.id);

	if (itemExistente) {
		itemExistente.quantidade += 1;
	} else {
		carrinho.push({
			id: instrumento.id,
			modelo: instrumento.modelo,
			preco: Number(instrumento.preco),
			tipo: instrumento.tipo?.nome ?? "Tipo não informado",
			quantidade: 1,
			pagamento: "a vista"
		});
	}

	salvarCarrinho(carrinho);
	mostrarCarrinho();
}

function alterarQuantidade(id, alteracao) {
	const carrinho = obterCarrinho();
	const item = carrinho.find((instrumento) => instrumento.id === id);

	if (!item) {
		return;
	}

	item.quantidade += alteracao;
	const carrinhoAtualizado = item.quantidade > 0
		? carrinho
		: carrinho.filter((instrumento) => instrumento.id !== id);

	salvarCarrinho(carrinhoAtualizado);
	mostrarCarrinho();
}

function removerDoCarrinho(id) {
	const carrinhoAtualizado = obterCarrinho()
		.filter((instrumento) => instrumento.id !== id);

	salvarCarrinho(carrinhoAtualizado);
	mostrarCarrinho();
}

function mostrarCarrinho() {
	const carrinho = obterCarrinho();

	if (carrinho.length === 0) {
		mensagemCarrinho.hidden = false;
		mensagemCarrinho.textContent = "Seu carrinho está vazio.";
		resumoCarrinho.hidden = true;
		listaCarrinho.replaceChildren();
		return;
	}

	mensagemCarrinho.hidden = true;
	resumoCarrinho.hidden = false;
	listaCarrinho.replaceChildren(
		...carrinho.map((item) => criarItemCarrinho(item))
	);

	const total = carrinho.reduce(
		(sum, item) => sum + Number(item.preco) * item.quantidade,
		0
	);
	totalCarrinho.textContent = formatadorPreco.format(total);
}

function criarItemCarrinho(item) {
	const elemento = document.createElement("li");
	elemento.className = "item-carrinho";

	const informacoes = document.createElement("div");
	informacoes.className = "item-carrinho__informacoes";

	const modelo = document.createElement("h3");
	modelo.className = "item-carrinho__modelo";
	modelo.textContent = item.modelo;

	const detalhes = document.createElement("p");
	detalhes.className = "item-carrinho__detalhes";
	detalhes.textContent = `${item.tipo} — ${formatadorPreco.format(Number(item.preco))} cada`;

	informacoes.append(modelo, detalhes);

	const controles = document.createElement("div");
	controles.className = "item-carrinho__controles";

	const botaoDiminuir = criarBotaoQuantidade("−", "Diminuir quantidade", () => {
		alterarQuantidade(item.id, -1);
	});

	const quantidade = document.createElement("span");
	quantidade.className = "item-carrinho__quantidade";
	quantidade.textContent = String(item.quantidade);
	quantidade.setAttribute("aria-label", `Quantidade: ${item.quantidade}`);

	const botaoAumentar = criarBotaoQuantidade("+", "Aumentar quantidade", () => {
		alterarQuantidade(item.id, 1);
	});

	const subtotal = document.createElement("strong");
	subtotal.className = "item-carrinho__subtotal";
	subtotal.textContent = formatadorPreco.format(Number(item.preco) * item.quantidade);

	const pagamento = document.createElement("label");
	pagamento.className = "item-carrinho__pagamento";
	pagamento.textContent = "Pagamento";

	const seletorPagamento = document.createElement("select");
	seletorPagamento.className = "item-carrinho__seletor-pagamento";
	seletorPagamento.setAttribute("aria-label", `Pagamento de ${item.modelo}`);
	for (const opcao of opcoesPagamento) {
		const elementoOpcao = document.createElement("option");
		elementoOpcao.value = opcao;
		elementoOpcao.textContent = opcao === "a vista" ? "À vista" : opcao;
		seletorPagamento.append(elementoOpcao);
	}
	seletorPagamento.value = opcoesPagamento.includes(item.pagamento)
		? item.pagamento
		: "a vista";
	seletorPagamento.addEventListener("change", () => {
		const carrinhoAtualizado = obterCarrinho();
		const itemAtualizado = carrinhoAtualizado.find((instrumento) => instrumento.id === item.id);

		if (!itemAtualizado) {
			return;
		}

		const pagamentoAnterior = itemAtualizado.pagamento;
		itemAtualizado.pagamento = seletorPagamento.value;
		if (!salvarCarrinho(carrinhoAtualizado)) {
			itemAtualizado.pagamento = pagamentoAnterior;
			seletorPagamento.value = opcoesPagamento.includes(pagamentoAnterior)
				? pagamentoAnterior
				: "a vista";
			mensagemCompra.textContent = "Não foi possível salvar a forma de pagamento escolhida.";
			return;
		}

		mensagemCompra.textContent = "";
	});
	pagamento.append(seletorPagamento);

	const botaoRemover = document.createElement("button");
	botaoRemover.className = "botao-remover-carrinho";
	botaoRemover.type = "button";
	botaoRemover.textContent = "Remover";
	botaoRemover.setAttribute("aria-label", `Remover ${item.modelo} do carrinho`);
	botaoRemover.addEventListener("click", () => removerDoCarrinho(item.id));

	controles.append(
		botaoDiminuir,
		quantidade,
		botaoAumentar,
		subtotal,
		pagamento,
		botaoRemover
	);
	elemento.append(informacoes, controles);
	return elemento;
}

function criarBotaoQuantidade(texto, rotulo, acao) {
	const botao = document.createElement("button");
	botao.className = "botao-quantidade-carrinho";
	botao.type = "button";
	botao.textContent = texto;
	botao.setAttribute("aria-label", rotulo);
	botao.addEventListener("click", acao);
	return botao;
}

async function finalizarCompra() {
	const carrinho = obterCarrinho();
	if (carrinho.length === 0) {
		mensagemCompra.textContent = "Adicione instrumentos ao carrinho antes de concluir a compra.";
		return;
	}

	let cliente;
	try {
		cliente = JSON.parse(sessionStorage.getItem("clienteLogado") ?? "null");
	} catch (error) {
		console.error("Erro ao ler os dados da sessão:", error);
	}

	if (!cliente?.cpf) {
		mensagemCompra.textContent = "Faça login novamente para concluir a compra.";
		return;
	}

	const compras = [];
	for (const item of carrinho) {
		const instrumentoId = Number(item.id);
		const quantidade = Number(item.quantidade);
		const pagamento = opcoesPagamento.includes(item.pagamento) ? item.pagamento : "a vista";

		if (!Number.isInteger(instrumentoId) || instrumentoId <= 0 ||
			!Number.isInteger(quantidade) || quantidade <= 0) {
			mensagemCompra.textContent = "Não foi possível validar os itens do carrinho.";
			return;
		}

		for (let unidade = 0; unidade < quantidade; unidade += 1) {
			compras.push({
				feita_por: cliente.cpf,
				instrumento_comprado: instrumentoId,
				pagamento
			});
		}
	}

	botaoFinalizarCompra.disabled = true;
	mensagemCompra.textContent = "Registrando sua compra...";
	let compraRegistrada = false;
	let carrinhoLimpo = false;
	try {
		const { error } = await supabase.from("compra").insert(compras);

		if (error) {
			console.error("Erro ao registrar a compra:", error);
			mensagemCompra.textContent = "Não foi possível registrar a compra. Tente novamente.";
			return;
		}

		compraRegistrada = true;
		if (!salvarCarrinho([])) {
			mostrarCarrinho();
			mensagemCompra.textContent = "Compra registrada, mas não foi possível limpar o carrinho salvo neste navegador. Não tente concluir a compra novamente.";
			return;
		}
		carrinhoLimpo = true;

		mostrarCarrinho();
		mensagemCompra.textContent = "Compra realizada com sucesso! Esperamos que você goste de nossos produtos.";
	} catch (error) {
		console.error("Erro ao conectar com o Supabase:", error);
		mensagemCompra.textContent = "Não foi possível conectar ao serviço. Tente novamente.";
	} finally {
		botaoFinalizarCompra.disabled = compraRegistrada && !carrinhoLimpo;
	}
}

async function carregarInstrumentos() {
	try {
		const { data, error } = await supabase
			.from("instrumento_estoque")
			.select("id, modelo, preco, tipo:tipo_id(id, nome, descricao)")
			.order("id");

		if (error) {
			console.error("Erro ao consultar o estoque:", error);
			mensagemEstoque.textContent = "Não foi possível carregar os instrumentos.";
			mensagemEstoque.className = "mensagem-estoque mensagem-estoque--erro";
			return;
		}

		if (!data || data.length === 0) {
			mensagemEstoque.textContent = "Nenhum instrumento disponível no momento.";
			return;
		}

		instrumentos = data ?? [];
		try {
			resenhasPorInstrumento = await carregarResenhas(instrumentos.map((item) => item.id));
			erroAoCarregarResenhas = false;
		} catch (error) {
			console.error("Erro ao carregar as avaliações:", error);
			resenhasPorInstrumento = new Map();
			erroAoCarregarResenhas = true;
		}

		paginaAtual = 1;
		mostrarPaginaAtual();
	} catch (error) {
		console.error("Erro ao conectar com o Supabase:", error);
		mensagemEstoque.textContent = "Não foi possível conectar ao serviço.";
		mensagemEstoque.className = "mensagem-estoque mensagem-estoque--erro";
	}
}

function obterItensPorPagina() {
	const colunas = telaHorizontal.matches ? 5 : 3;
	return colunas * 10;
}

function mostrarPaginaAtual() {
	if (instrumentos.length === 0) {
		mensagemEstoque.textContent = "Nenhum instrumento disponível no momento.";
		navegacaoPaginacao.hidden = true;
		listaInstrumentos.replaceChildren();
		return;
	}

	const itensPorPagina = obterItensPorPagina();
	const totalPaginas = Math.ceil(instrumentos.length / itensPorPagina);

	if (paginaAtual > totalPaginas) {
		paginaAtual = totalPaginas;
	}

	const inicio = (paginaAtual - 1) * itensPorPagina;
	const instrumentosDaPagina = instrumentos.slice(inicio, inicio + itensPorPagina);

	mensagemEstoque.hidden = true;
	listaInstrumentos.replaceChildren(
		...instrumentosDaPagina.map((instrumento) => criarItemInstrumento(instrumento))
	);

	navegacaoPaginacao.hidden = totalPaginas === 1;
	botaoAnterior.disabled = paginaAtual === 1;
	botaoSeguinte.disabled = paginaAtual === totalPaginas;
	indicadorPagina.textContent = `Página ${paginaAtual} de ${totalPaginas}`;
}

function criarItemInstrumento(instrumento) {
	const item = document.createElement("li");
	item.className = "instrumento-card";

	const modelo = document.createElement("h3");
	modelo.className = "instrumento-card__modelo";
	modelo.textContent = instrumento.modelo;

	const tipo = document.createElement("p");
	tipo.className = "instrumento-card__tipo";
	tipo.textContent = instrumento.tipo?.nome ?? "Tipo não informado";

	const preco = document.createElement("strong");
	preco.className = "instrumento-card__preco";
	preco.textContent = formatadorPreco.format(Number(instrumento.preco));

	const botaoCarrinho = document.createElement("button");
	botaoCarrinho.className = "formulario__botao instrumento-card__botao";
	botaoCarrinho.type = "button";
	botaoCarrinho.textContent = "Adicionar ao carrinho";
	botaoCarrinho.setAttribute("aria-label", `Adicionar ${instrumento.modelo} ao carrinho`);

	botaoCarrinho.addEventListener("click", () => {
		adicionarAoCarrinho(instrumento);
		botaoCarrinho.textContent = "Adicionado";
		botaoCarrinho.disabled = true;

		window.setTimeout(() => {
			botaoCarrinho.textContent = "Adicionar ao carrinho";
			botaoCarrinho.disabled = false;
		}, 1200);
	});

	const secaoResenhas = criarSecaoResenha(
		instrumento.id,
		resenhasPorInstrumento.get(instrumento.id) ?? [],
		erroAoCarregarResenhas
	);

	item.append(modelo, tipo, preco, botaoCarrinho, secaoResenhas);
	return item;
}

botaoAnterior.addEventListener("click", () => {
	paginaAtual -= 1;
	mostrarPaginaAtual();
});

botaoSeguinte.addEventListener("click", () => {
	paginaAtual += 1;
	mostrarPaginaAtual();
});

botaoFinalizarCompra.addEventListener("click", finalizarCompra);

telaHorizontal.addEventListener("change", () => {
	paginaAtual = 1;
	mostrarPaginaAtual();
});

window.addEventListener("storage", (evento) => {
	if (evento.key === chaveCarrinho) {
		mostrarCarrinho();
	}
});

mostrarCarrinho();
carregarClienteLogado();
carregarInstrumentos();