// =============================================================================
// Função convidar-usuario
// Usada pela área da equipe para dar acesso a um cliente (ou a alguém da equipe).
// Roda no servidor do Supabase com a chave de serviço, que nunca vai para o navegador.
//
// Entrada (POST, JSON):
//   email       e-mail da pessoa                                     (obrigatório)
//   nome        nome da pessoa                                       (obrigatório)
//   telefone    WhatsApp                                             (opcional)
//   papel       "cliente" | "equipe"                                 (padrão "cliente")
//   empresa_id  empresa a que o cliente terá acesso                  (obrigatório para cliente)
//   funcao      "socio" | "funcionario"                              (padrão "socio")
//   modo        "senha": cria com senha provisória para enviar no WhatsApp
//               "convite": manda e-mail de convite (precisa de SMTP configurado)
//
// Saída: { usuario_id, ja_existia, senha_provisoria? }
// Só quem é da equipe e está ativo pode chamar.
// =============================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Entrada = {
  email?: string;
  nome?: string;
  telefone?: string;
  papel?: "cliente" | "equipe";
  empresa_id?: string;
  funcao?: "socio" | "funcionario";
  modo?: "senha" | "convite";
};

function resposta(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// Senha provisória legível: 12 caracteres sem letras que se confundem (0/O, 1/l).
function senhaProvisoria(): string {
  const letras = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => letras[b % letras.length]).join("");
}

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_VALIDO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return resposta({ erro: "Use POST." }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Quem está chamando precisa ser da equipe.
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: quem, error: erroQuem } = await admin.auth.getUser(token);
  if (erroQuem || !quem.user) return resposta({ erro: "Faça login de novo." }, 401);
  const { data: perfilQuem } = await admin
    .from("perfis")
    .select("papel, ativo")
    .eq("id", quem.user.id)
    .single();
  if (!perfilQuem || perfilQuem.papel !== "equipe" || !perfilQuem.ativo) {
    return resposta({ erro: "Só a equipe da Lócus pode dar acesso." }, 403);
  }

  // 2. Confere os dados.
  let entrada: Entrada;
  try {
    entrada = await req.json();
  } catch (_) {
    return resposta({ erro: "Dados inválidos." }, 400);
  }
  const email = (entrada.email ?? "").trim().toLowerCase();
  const nome = (entrada.nome ?? "").trim().slice(0, 120);
  const papel = entrada.papel === "equipe" ? "equipe" : "cliente";
  const funcao = entrada.funcao === "funcionario" ? "funcionario" : "socio";
  const modo = entrada.modo === "convite" ? "convite" : "senha";
  if (!EMAIL_VALIDO.test(email)) return resposta({ erro: "E-mail inválido." }, 400);
  if (nome.length < 2) return resposta({ erro: "Informe o nome." }, 400);
  if (papel === "cliente" && !UUID_VALIDO.test(entrada.empresa_id ?? "")) {
    return resposta({ erro: "Escolha a empresa do cliente." }, 400);
  }

  // 3. Cria o login, se ainda não existir.
  const { data: existente } = await admin.from("perfis").select("id").eq("email", email).maybeSingle();
  let usuarioId = existente?.id as string | undefined;
  let senha: string | undefined;

  if (!usuarioId) {
    if (modo === "convite") {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        data: { nome },
        redirectTo: Deno.env.get("URL_APP") ?? undefined,
      });
      if (error) return resposta({ erro: `Não consegui enviar o convite: ${error.message}` }, 400);
      usuarioId = data.user.id;
    } else {
      senha = senhaProvisoria();
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: { nome, trocar_senha: true },
      });
      if (error) return resposta({ erro: `Não consegui criar o acesso: ${error.message}` }, 400);
      usuarioId = data.user.id;
    }
  }

  // 4. Atualiza o perfil e dá acesso à empresa.
  const mudancas: Record<string, unknown> = { nome };
  if (entrada.telefone) mudancas.telefone = String(entrada.telefone).slice(0, 30);
  if (papel === "equipe") mudancas.papel = "equipe";
  const { error: erroPerfil } = await admin.from("perfis").update(mudancas).eq("id", usuarioId);
  if (erroPerfil) return resposta({ erro: "Login criado, mas não consegui salvar o perfil." }, 500);

  if (papel === "cliente") {
    const { error } = await admin
      .from("empresa_membros")
      .upsert({ empresa_id: entrada.empresa_id, usuario_id: usuarioId, funcao });
    if (error) return resposta({ erro: "Login criado, mas não consegui ligar à empresa." }, 500);
  }

  return resposta({ usuario_id: usuarioId, ja_existia: Boolean(existente), senha_provisoria: senha });
});
