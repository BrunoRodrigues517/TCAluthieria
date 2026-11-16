import { supabase } from "./conexao.js";

const formulario = document.querySelector("#form-registro");
const mensagem = document.querySelector("#mensagem-registro");
const campoCep = formulario.elements.namedItem("cep");

campoCep.addEventListener("input", () => {
	campoCep.value = campoCep.value.replace(/\D/g, "").slice(0, 8);
});

async function registrarCliente(evento) {
	evento.preventDefault();
	mensagem.textContent = "";

	const botao = formulario.querySelector('button[type="submit"]');
	botao.disabled = true;

	const dados = new FormData(formulario);
	const cep = String(dados.get("cep")).replace(/\D/g, "");
	if (cep.length !== 8) {
		mensagem.textContent = "Informe um CEP com 8 dígitos.";
		botao.disabled = false;
		campoCep.focus();
		return;
	}

	const cliente = {
		cpf: String(dados.get("cpf")).trim(),
		nome: String(dados.get("nome")).trim(),
		nascimento: dados.get("nascimento"),
		email: String(dados.get("email")).trim().toLowerCase(),
		senha: dados.get("senha"),
		cep,
		numero_casa: String(dados.get("numero_casa")).trim()
	};

	try {
		const { error } = await supabase.from("cliente").insert(cliente);

		if (error) {
			if (error.code === "23505") {
				mensagem.textContent = "Este e-mail ou CPF já está cadastrado.";
			} else {
				console.error("Erro ao registrar cliente:", error);
				mensagem.textContent = `Erro ao registrar: ${error.message}`;
			}
			return;
		}

		mensagem.textContent = "Cadastro realizado com sucesso. Você já pode fazer login.";
		formulario.reset();
	} catch (error) {
		console.error("Erro ao conectar com o Supabase:", error);
		mensagem.textContent = `Erro de conexão: ${error.message}`;
	} finally {
		botao.disabled = false;
	}
}

formulario.addEventListener("submit", registrarCliente);
