import { supabase } from "./conexao.js";

const listaEstoque = document.querySelector("#lista-estoque-gerente");
const mensagemEstoque = document.querySelector("#mensagem-estoque-gerente");
const campoPesquisa = document.querySelector("#pesquisa-estoque-nome");
const filtroTipo = document.querySelector("#filtro-estoque-tipo");
const navegacaoPaginacao = document.querySelector(".paginacao-estoque");
const botaoAnterior = document.querySelector("#pagina-anterior-gerente");
const botaoSeguinte = document.querySelector("#pagina-seguinte-gerente");
const indicadorPagina = document.querySelector("#indicador-pagina-gerente");

const formatadorPreco = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL"
});

let instrumentos = [];
let instrumentosFiltrados = [];
let paginaAtual = 1;

async function carregarEstoque() {
	mensagemEstoque.hidden = false;
	mensagemEstoque.className = "mensagem-estoque";
	mensagemEstoque.textContent = "Carregando instrumentos...";

	try {
		const { data, error } = await supabase
			.from("instrumento_estoque")
			.select("id, modelo, preco, tipo:tipo_id(id, nome)")
			.order("id");

		if (error) {
			console.error("Erro ao consultar o estoque:", error);
			listaEstoque.replaceChildren();
			navegacaoPaginacao.hidden = true;
			mensagemEstoque.className = "mensagem-estoque mensagem-estoque--erro";
			mensagemEstoque.textContent = "Não foi possível carregar o estoque.";
			return false;
		}

		instrumentos = data ?? [];
		preencherFiltroTipos();
		aplicarFiltros();
		return true;
	} catch (error) {
		console.error("Erro ao conectar com o Supabase:", error);
		listaEstoque.replaceChildren();
		navegacaoPaginacao.hidden = true;
		mensagemEstoque.className = "mensagem-estoque mensagem-estoque--erro";
		mensagemEstoque.textContent = "Não foi possível conectar ao serviço.";
		return false;
	}
}

function preencherFiltroTipos() {
	const tipoSelecionado = filtroTipo.value;
	const tipos = [...new Set(
		instrumentos
			.map((instrumento) => instrumento.tipo?.nome)
			.filter(Boolean)
	)].sort((a, b) => a.localeCompare(b, "pt-BR"));

	const opcaoTodos = document.createElement("option");
	opcaoTodos.value = "";
	opcaoTodos.textContent = "Todos os tipos";
	filtroTipo.replaceChildren(
		opcaoTodos,
		...tipos.map((tipo) => {
			const opcao = document.createElement("option");
			opcao.value = tipo;
			opcao.textContent = tipo;
			return opcao;
		})
	);

	if (tipos.includes(tipoSelecionado)) {
		filtroTipo.value = tipoSelecionado;
	}
}

function normalizarTexto(texto) {
	return texto
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLocaleLowerCase("pt-BR");
}

function aplicarFiltros() {
	const termo = normalizarTexto(campoPesquisa.value.trim());
	const tipoSelecionado = filtroTipo.value;

	instrumentosFiltrados = instrumentos.filter((instrumento) => {
		const nome = normalizarTexto(instrumento.modelo);
		const tipo = instrumento.tipo?.nome ?? "";
		return nome.includes(termo) && (!tipoSelecionado || tipo === tipoSelecionado);
	});

	paginaAtual = 1;
	mostrarPaginaAtual();
}

function obterItensPorPagina() {
	const colunas = window.getComputedStyle(listaEstoque).gridTemplateColumns
		.trim()
		.split(/\s+/).length;
	return Math.max(1, colunas) * 3;
}

function mostrarPaginaAtual() {
	if (instrumentos.length === 0) {
		mensagemEstoque.hidden = false;
		mensagemEstoque.className = "mensagem-estoque";
		mensagemEstoque.textContent = "Nenhum instrumento disponível no estoque.";
		navegacaoPaginacao.hidden = true;
		listaEstoque.replaceChildren();
		return;
	}

	if (instrumentosFiltrados.length === 0) {
		mensagemEstoque.hidden = false;
		mensagemEstoque.className = "mensagem-estoque";
		mensagemEstoque.textContent = "Nenhum instrumento encontrado com esses filtros.";
		navegacaoPaginacao.hidden = true;
		listaEstoque.replaceChildren();
		return;
	}

	const itensPorPagina = obterItensPorPagina();
	const totalPaginas = Math.ceil(instrumentosFiltrados.length / itensPorPagina);
	const inicio = (paginaAtual - 1) * itensPorPagina;
	const instrumentosDaPagina = instrumentosFiltrados.slice(inicio, inicio + itensPorPagina);

	mensagemEstoque.hidden = true;
	listaEstoque.replaceChildren(
		...instrumentosDaPagina.map((instrumento) => criarItemEstoque(instrumento))
	);

	navegacaoPaginacao.hidden = totalPaginas === 1;
	botaoAnterior.disabled = paginaAtual === 1;
	botaoSeguinte.disabled = paginaAtual === totalPaginas;
	indicadorPagina.textContent = `Página ${paginaAtual} de ${totalPaginas}`;
}

function criarItemEstoque(instrumento) {
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

	const statusEstoque = document.createElement("p");
	statusEstoque.className = "estoque-card__status";
	statusEstoque.textContent = "Em estoque";

	const botaoRemover = document.createElement("button");
	botaoRemover.className = "formulario__botao instrumento-card__botao";
	botaoRemover.type = "button";
	botaoRemover.textContent = "Remover do estoque";
	botaoRemover.setAttribute("aria-label", `Remover ${instrumento.modelo} do estoque`);
	botaoRemover.addEventListener("click", () => removerInstrumento(instrumento, botaoRemover));

	item.append(modelo, tipo, preco, statusEstoque, botaoRemover);
	return item;
}

async function removerInstrumento(instrumento, botaoRemover) {
	botaoRemover.disabled = true;
	mensagemEstoque.hidden = false;
	mensagemEstoque.className = "mensagem-estoque";
	mensagemEstoque.textContent = `Removendo ${instrumento.modelo} do estoque...`;

	try {
		const { data, error } = await supabase
			.from("instrumento_estoque")
			.delete()
			.eq("id", instrumento.id)
			.select("id")
			.maybeSingle();

		if (error) {
			if (error.code === "23503") {
				mensagemEstoque.className = "mensagem-estoque mensagem-estoque--erro";
				mensagemEstoque.textContent = "Não é possível remover este instrumento porque há compras ou avaliações vinculadas.";
				return;
			}

			console.error("Erro ao remover o instrumento do estoque:", error);
			mensagemEstoque.className = "mensagem-estoque mensagem-estoque--erro";
			mensagemEstoque.textContent = "Não foi possível remover o instrumento do estoque.";
			return;
		}

		if (!data) {
			mensagemEstoque.className = "mensagem-estoque mensagem-estoque--erro";
			mensagemEstoque.textContent = "O instrumento não foi encontrado no estoque.";
			return;
		}

		const estoqueAtualizado = await carregarEstoque();
		if (estoqueAtualizado) {
			mensagemEstoque.hidden = false;
			mensagemEstoque.className = "mensagem-estoque";
			mensagemEstoque.textContent = `${instrumento.modelo} foi removido do estoque.`;
		} else {
			mensagemEstoque.hidden = false;
			mensagemEstoque.className = "mensagem-estoque mensagem-estoque--erro";
			mensagemEstoque.textContent = `${instrumento.modelo} foi removido, mas não foi possível atualizar a lista. Recarregue a página.`;
		}
	} catch (error) {
		console.error("Erro ao conectar com o Supabase:", error);
		mensagemEstoque.className = "mensagem-estoque mensagem-estoque--erro";
		mensagemEstoque.textContent = "Não foi possível conectar ao serviço.";
	} finally {
		botaoRemover.disabled = false;
	}
}

botaoAnterior.addEventListener("click", () => {
	paginaAtual -= 1;
	mostrarPaginaAtual();
});

botaoSeguinte.addEventListener("click", () => {
	paginaAtual += 1;
	mostrarPaginaAtual();
});

campoPesquisa.addEventListener("input", aplicarFiltros);
filtroTipo.addEventListener("change", aplicarFiltros);

window.addEventListener("resize", () => {
	paginaAtual = 1;
	mostrarPaginaAtual();
});

window.addEventListener("estoque-atualizado", () => {
	paginaAtual = 1;
	carregarEstoque();
});

carregarEstoque();