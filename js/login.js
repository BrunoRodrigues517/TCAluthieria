import { supabase } from "./conexao.js";

const formulario = document.querySelector("#form-login");
const mensagem = document.querySelector("#mensagem-login");

async function fazerLogin(evento) {
	evento.preventDefault();
	mensagem.textContent = "";

	const botao = formulario.querySelector('button[type="submit"]');
	botao.disabled = true;

	const dados = new FormData(formulario);
	const email = String(dados.get("email")).trim().toLowerCase();

	try {
		const { data, error } = await supabase
			.from("cliente")
			.select("cpf")
			.eq("email", email)
			.eq("senha", dados.get("senha"))
			.maybeSingle();

		if (error) {
			console.error("Erro ao verificar o cliente:", error);
			mensagem.textContent = "Não foi possível verificar os dados. Tente novamente.";
			return;
		}

		if (!data) {
			mensagem.textContent = "E-mail ou senha inválidos. Confira os dados e tente novamente.";
			return;
		}

		sessionStorage.setItem("clienteLogado", JSON.stringify({
			cpf: data.cpf,
			email
		}));
		window.location.href = "pagina_cliente.html";
	} catch (error) {
		console.error("Erro ao conectar com o Supabase:", error);
		mensagem.textContent = "Não foi possível conectar ao serviço. Tente novamente.";
	} finally {
		botao.disabled = false;
	}
}

formulario.addEventListener("submit", fazerLogin);