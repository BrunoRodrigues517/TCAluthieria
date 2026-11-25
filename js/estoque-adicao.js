import { supabase } from "./conexao.js";

const formulario = document.querySelector("#form-adicionar-estoque");
const campoModelo = document.querySelector("#modelo-instrumento");
const campoTipo = document.querySelector("#tipo-instrumento");
const campoNovoTipo = document.querySelector("#novo-tipo-instrumento");
const listaTipos = campoTipo;
const campoPreco = document.querySelector("#preco-instrumento");
const botaoAdicionar = formulario.querySelector('button[type="submit"]');
const mensagem = document.querySelector("#mensagem-adicionar-estoque");

let tiposInstrumento = [];

function converterPreco(valor) {
	const normalizado = valor.trim().replace(",", ".");
	if (!/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(normalizado)) {
		return null;
	}

	const preco = Number(normalizado);
	return Number.isFinite(preco) && preco >= 0 && preco <= 99999999.99
		? preco
		: null;
}

function formatarCampoPreco() {
	if (!campoPreco.value.trim()) {
		return;
	}

	const preco = converterPreco(campoPreco.value);
	if (preco !== null) {
		campoPreco.value = preco.toFixed(2).replace(".", ",");
	}
}

async function carregarTipos() {
	mensagem.textContent = "Carregando tipos de instrumento...";

	try {
		const { data, error } = await supabase
			.from("tipo_instrumento_estoque")
			.select("id, nome")
			.order("nome");

		if (error) {
			console.error("Erro ao carregar os tipos de instrumento:", error);
			mensagem.textContent = "Não foi possível carregar os tipos de instrumento.";
			return;
		}

		tiposInstrumento = data ?? [];
		const opcaoInicial = document.createElement("option");
		opcaoInicial.value = "";
		opcaoInicial.textContent = "Selecione um tipo";
		listaTipos.replaceChildren(
			opcaoInicial,
			...tiposInstrumento.map((tipo) => {
				const opcao = document.createElement("option");
				opcao.value = String(tipo.id);
				opcao.textContent = tipo.nome;
				return opcao;
			})
		);
		botaoAdicionar.disabled = false;
		mensagem.textContent = tiposInstrumento.length === 0
			? "Não há tipos existentes. Registre um novo tipo no campo de Registrar novo tipo."
			: "";
	} catch (error) {
		console.error("Erro ao conectar com o Supabase:", error);
		mensagem.textContent = "Não foi possível conectar ao serviço.";
	}
}

async function obterOuCriarTipo(nome) {
	const tipoExistente = tiposInstrumento.find(
		(tipo) => tipo.nome.trim().toLocaleLowerCase("pt-BR") === nome.toLocaleLowerCase("pt-BR")
	);

	if (tipoExistente) {
		return { tipo: tipoExistente, error: null, criado: false };
	}

	const { data, error } = await supabase
		.from("tipo_instrumento_estoque")
		.insert({ nome })
		.select("id, nome")
		.single();

	if (error) {
		return { tipo: null, error, criado: false };
	}

	tiposInstrumento.push(data);
	const opcao = document.createElement("option");
	opcao.value = String(data.id);
	opcao.textContent = data.nome;
	listaTipos.append(opcao);
	return { tipo: data, error: null, criado: true };
}

async function adicionarInstrumento(evento) {
	evento.preventDefault();
	mensagem.textContent = "";

	const modelo = campoModelo.value.trim();
	const nomeTipoNovo = campoNovoTipo.value.trim();
	const idTipoSelecionado = Number(campoTipo.value);
	const tipoSelecionado = tiposInstrumento.find((tipo) => Number(tipo.id) === idTipoSelecionado);
	const preco = converterPreco(campoPreco.value);

	if (!modelo || (!nomeTipoNovo && !tipoSelecionado) || preco === null) {
		mensagem.textContent = "Preencha o modelo, selecione ou registre um tipo e informe um preço válido com até duas casas decimais.";
		return;
	}
	campoPreco.value = preco.toFixed(2).replace(".", ",");

	botaoAdicionar.disabled = true;
	mensagem.textContent = "Salvando instrumento...";
	try {
		let tipo = tipoSelecionado;
		let tipoCriado = false;
		if (nomeTipoNovo) {
			const resultadoTipo = await obterOuCriarTipo(nomeTipoNovo);
			if (resultadoTipo.error) {
				console.error("Erro ao salvar o tipo de instrumento:", resultadoTipo.error);
				mensagem.textContent = "Não foi possível salvar o novo tipo de instrumento.";
				return;
			}

			tipo = resultadoTipo.tipo;
			tipoCriado = resultadoTipo.criado;
		}

		const { error } = await supabase
			.from("instrumento_estoque")
			.insert({
				modelo,
				tipo_id: tipo.id,
				preco
			});

		if (error) {
			console.error("Erro ao adicionar o instrumento ao estoque:", error);
			mensagem.textContent = tipoCriado
				? `O tipo ${tipo.nome} foi cadastrado, mas não foi possível adicionar o instrumento.`
				: "Não foi possível adicionar o instrumento ao estoque.";
			return;
		}

		formulario.reset();
		mensagem.textContent = tipoCriado
			? `${modelo} e o novo tipo ${tipo.nome} foram cadastrados com sucesso.`
			: `${modelo} foi adicionado ao estoque com sucesso.`;
		window.dispatchEvent(new CustomEvent("estoque-atualizado"));
	} catch (error) {
		console.error("Erro ao conectar com o Supabase:", error);
		mensagem.textContent = "Não foi possível conectar ao serviço.";
	} finally {
		botaoAdicionar.disabled = false;
	}
}

formulario.addEventListener("submit", adicionarInstrumento);
campoPreco.addEventListener("blur", formatarCampoPreco);
carregarTipos();