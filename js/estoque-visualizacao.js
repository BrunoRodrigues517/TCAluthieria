import { supabase } from "./conexao.js";

const listaEstoque = document.querySelector("#lista-estoque-gerente");
const mensagemEstoque = document.querySelector("#mensagem-estoque-gerente");
const navegacaoPaginacao = document.querySelector(".paginacao-estoque");
const botaoAnterior = document.querySelector("#pagina-anterior-gerente");
const botaoSeguinte = document.querySelector("#pagina-seguinte-gerente");
const indicadorPagina = document.querySelector("#indicador-pagina-gerente");
const telaHorizontal = window.matchMedia("(orientation: landscape)");

const formatadorPreco = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL"
});

let instrumentos = [];
let paginaAtual = 1;

function agruparInstrumentos(instrumentosCarregados) {
	const grupos = new Map();

	for (const instrumento of instrumentosCarregados) {
		const preco = Number(instrumento.preco);
		const tipoId = instrumento.tipo?.id ?? instrumento.tipo_id;
		const chave = JSON.stringify([instrumento.modelo, tipoId, preco]);
		let grupo = grupos.get(chave);

		if (!grupo) {
			grupo = {
				modelo: instrumento.modelo,
				tipo: instrumento.tipo?.nome ?? "Tipo não informado",
				preco,
				instrumentos: []
			};
			grupos.set(chave, grupo);
		}

		grupo.instrumentos.push({ id: instrumento.id });
	}

	return [...grupos.values()];
}

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

		instrumentos = agruparInstrumentos(data ?? []);
		paginaAtual = Math.min(paginaAtual, Math.max(1, Math.ceil(instrumentos.length / obterItensPorPagina())));
		mostrarPaginaAtual();
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

function obterItensPorPagina() {
	const colunas = telaHorizontal.matches ? 5 : 3;
	return colunas * 10;
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

	const itensPorPagina = obterItensPorPagina();
	const totalPaginas = Math.ceil(instrumentos.length / itensPorPagina);
	const inicio = (paginaAtual - 1) * itensPorPagina;
	const instrumentosDaPagina = instrumentos.slice(inicio, inicio + itensPorPagina);

	mensagemEstoque.hidden = true;
	listaEstoque.replaceChildren(
		...instrumentosDaPagina.map((grupo) => criarItemEstoque(grupo))
	);

	navegacaoPaginacao.hidden = totalPaginas === 1;
	botaoAnterior.disabled = paginaAtual === 1;
	botaoSeguinte.disabled = paginaAtual === totalPaginas;
	indicadorPagina.textContent = `Página ${paginaAtual} de ${totalPaginas}`;
}

function criarItemEstoque(grupo) {
	const item = document.createElement("li");
	item.className = "instrumento-card";

	const modelo = document.createElement("h3");
	modelo.className = "instrumento-card__modelo";
	modelo.textContent = grupo.modelo;

	const tipo = document.createElement("p");
	tipo.className = "instrumento-card__tipo";
	tipo.textContent = grupo.tipo;

	const preco = document.createElement("strong");
	preco.className = "instrumento-card__preco";
	preco.textContent = formatadorPreco.format(grupo.preco);

	const quantidade = document.createElement("p");
	quantidade.className = "estoque-card__quantidade";
	quantidade.textContent = `Quantidade em estoque: ${grupo.instrumentos.length}`;

	const botaoRemover = document.createElement("button");
	botaoRemover.className = "formulario__botao instrumento-card__botao";
	botaoRemover.type = "button";
	botaoRemover.textContent = "Remover 1 unidade";
	botaoRemover.setAttribute("aria-label", `Remover uma unidade de ${grupo.modelo}`);
	botaoRemover.addEventListener("click", () => removerUnidade(grupo, botaoRemover));

	item.append(modelo, tipo, preco, quantidade, botaoRemover);
	return item;
}

async function removerUnidade(grupo, botaoRemover) {
	botaoRemover.disabled = true;
	mensagemEstoque.hidden = false;
	mensagemEstoque.className = "mensagem-estoque";
	mensagemEstoque.textContent = `Removendo uma unidade de ${grupo.modelo}...`;

	let encontrouReferencia = false;
	try {
		for (const instrumento of grupo.instrumentos) {
			const { data, error } = await supabase
				.from("instrumento_estoque")
				.delete()
				.eq("id", instrumento.id)
				.select("id")
				.maybeSingle();

			if (error) {
				if (error.code === "23503") {
					encontrouReferencia = true;
					continue;
				}

				console.error("Erro ao remover o instrumento do estoque:", error);
				mensagemEstoque.className = "mensagem-estoque mensagem-estoque--erro";
				mensagemEstoque.textContent = "Não foi possível remover o instrumento do estoque.";
				return;
			}

			if (!data) {
				continue;
			}

			const estoqueAtualizado = await carregarEstoque();
			if (estoqueAtualizado) {
				mensagemEstoque.hidden = false;
				mensagemEstoque.className = "mensagem-estoque";
				mensagemEstoque.textContent = `Uma unidade de ${grupo.modelo} foi removida do estoque.`;
			} else {
				mensagemEstoque.hidden = false;
				mensagemEstoque.className = "mensagem-estoque mensagem-estoque--erro";
				mensagemEstoque.textContent = `Uma unidade de ${grupo.modelo} foi removida, mas não foi possível atualizar a lista. Recarregue a página.`;
			}
			return;
		}

		mensagemEstoque.className = "mensagem-estoque mensagem-estoque--erro";
		mensagemEstoque.textContent = encontrouReferencia
			? "Não é possível remover este instrumento porque há compras ou avaliações vinculadas."
			: "O instrumento não foi encontrado no estoque.";
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

telaHorizontal.addEventListener("change", () => {
	paginaAtual = 1;
	mostrarPaginaAtual();
});

window.addEventListener("estoque-atualizado", () => {
	paginaAtual = 1;
	carregarEstoque();
});

carregarEstoque();