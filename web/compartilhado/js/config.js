/**
 * Configuração pública do projeto no Supabase.
 * A chave publicável pode ficar no código: ela só permite o que as regras de acesso
 * (Row Level Security) do banco permitem. A chave de serviço NUNCA entra aqui.
 * Os valores são preenchidos quando o projeto do Supabase é criado.
 */
export const CONFIG = Object.freeze({
  supabaseUrl: "",
  supabaseChave: "",
  /** Endereço do app, usado nos links enviados por e-mail. */
  urlApp: "https://paulosergio4.github.io/locus-contabilidade/app/",
  whatsapp: "5537000000000",
});

/** Diz se o projeto do Supabase já foi configurado. */
export function supabaseConfigurado() {
  return Boolean(CONFIG.supabaseUrl && CONFIG.supabaseChave);
}
