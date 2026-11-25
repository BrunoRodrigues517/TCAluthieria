import { supabase } from "./conexao.js";

const saldoTotal = document.querySelector("#saldo-total");
const saldoCompras = document.querySelector("#saldo-compras");
const saldoReparos = document.querySelector("#saldo-reparos");
const mensagemSaldo = document.querySelector("#mensagem-saldo");
const mensagemHistorico = document.querySelector("#mensagem-historico");
const containerHistorico = document.querySelector("#historico-tabela-container");
const corpoHistorico = document.querySelector("#historico-tabela-corpo");

const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL"
});
const formatadorData = new Intl.DateTimeFormat("pt-BR", {
	dateStyle: "medium",
	timeZone: "UTC"
});
const tamanhoPagina = 1000;

async function carregarTodasAsCompras() {
	const compras = [];

	for (let inicio = 0; ; inicio += tamanhoPagina) {
		const { data, error } = await supabase
			.from("compra")
			.select("id, data_compra, feita_por, cliente(nome), instrumento_estoque(modelo, preco)")
			.order("id")
			.range(inicio, inicio + tamanhoPagina - 1);

		if (error) {
			throw error;
		}

		compras.push(...(data ?? []));
		if (!data || data.length < tamanhoPagina) {
			return compras;
		}
	}
}

async function carregarTodasAsEntregas() {
	const entregas = [];

	for (let inicio = 0; ; inicio += tamanhoPagina) {
		const { data, error } = await supabase
			.from("entrega")
			.select("id, data_entrega, dono_instrumento, preco_conserto, cliente(nome), instrumento_conserto(modelo)")
			.order("id")
			.range(inicio, inicio + tamanhoPagina - 1);

		if (error) {
			throw error;
		}

		entregas.push(...(data ?? []));
		if (!data || data.length < tamanhoPagina) {
			return entregas;
		}
	}
}

function formatarDataBanco(data) {
	const [ano, mes, dia] = data.split("-").map(Number);
	return new Date(Date.UTC(ano, mes - 1, dia));
}

function mostrarHistorico(compras, entregas) {
	const registros = [
		...compras.map((compra) => ({
			id: compra.id,
			tipo: "Compra",
			data: compra.data_compra,
			instrumento: compra.instrumento_estoque?.modelo ?? "Não identificado",
			cliente: compra.cliente?.nome ?? "Não identificado",
			valor: Number(compra.instrumento_estoque?.preco)
		})),
		...entregas.map((entrega) => ({
			id: entrega.id,
			tipo: "Entrega",
			data: entrega.data_entrega,
			instrumento: entrega.instrumento_conserto?.modelo ?? "Não identificado",
			cliente: entrega.cliente?.nome ?? "Não identificado",
			valor: Number(entrega.preco_conserto)
		}))
	].sort((a, b) => b.data.localeCompare(a.data) || a.tipo.localeCompare(b.tipo, "pt-BR"));

	corpoHistorico.replaceChildren();
	if (registros.length === 0) {
		containerHistorico.hidden = true;
		mensagemHistorico.textContent = "Nenhuma compra ou entrega foi registrada.";
		return;
	}

	const linhas = registros.map((registro) => {
		const linha = document.createElement("tr");
		const valores = [
			registro.tipo,
			formatadorData.format(formatarDataBanco(registro.data)),
			registro.instrumento,
			registro.cliente,
			formatadorMoeda.format(registro.valor)
		];

		for (const valor of valores) {
			const celula = document.createElement("td");
			celula.textContent = valor;
			linha.append(celula);
		}

		return linha;
	});

	corpoHistorico.replaceChildren(...linhas);
	containerHistorico.hidden = false;
	mensagemHistorico.textContent = "";
}

async function carregarSaldos() {
	try {
		const [compras, entregas] = await Promise.all([
			carregarTodasAsCompras(),
			carregarTodasAsEntregas()
		]);

		const totalCompras = compras.reduce((total, compra) => {
			const preco = compra.instrumento_estoque?.preco;
			if (preco == null || !Number.isFinite(Number(preco))) {
				throw new Error("Uma compra não possui preço de instrumento disponível.");
			}
			return total + Number(preco);
		}, 0);

		const totalReparos = entregas.reduce((total, entrega) => {
			const preco = Number(entrega.preco_conserto);
			if (!Number.isFinite(preco)) {
				throw new Error("Uma entrega possui preço de conserto inválido.");
			}
			return total + preco;
		}, 0);

		saldoCompras.textContent = formatadorMoeda.format(totalCompras);
		saldoReparos.textContent = formatadorMoeda.format(totalReparos);
		saldoTotal.textContent = formatadorMoeda.format(totalCompras + totalReparos);
		mensagemSaldo.textContent = "";
		mostrarHistorico(compras, entregas);
	} catch (error) {
		console.error("Erro ao carregar os saldos:", error);
		saldoTotal.textContent = "Indisponível";
		saldoCompras.textContent = "Indisponível";
		saldoReparos.textContent = "Indisponível";
		mensagemSaldo.textContent = "Não foi possível carregar os saldos.";
		containerHistorico.hidden = true;
		mensagemHistorico.textContent = "Não foi possível carregar o histórico de compras e entregas.";
	}
}

carregarSaldos();