/**
 * Configuração pública do projeto no Supabase.
 * A chave publicável pode ficar no código: ela só permite o que as regras de acesso
 * (Row Level Security) do banco permitem. A chave de serviço NUNCA entra aqui.
 * Projeto: locus-contabilidade, organização Lócus, região São Paulo (sa-east-1).
 */
export const CONFIG = Object.freeze({
  supabaseUrl: "https://cksyhdpqxxrxyjwsprgj.supabase.co",
  supabaseChave: "sb_publishable_qTis3aDISQci4cNhu985QA_fe_bnKLB",
  /** Endereço do app, usado nos links enviados por e-mail. */
  urlApp: "https://paulosergio4.github.io/locus-contabilidade/app/",
  whatsapp: "5537000000000",
});

/** Diz se o projeto do Supabase já foi configurado. */
export function supabaseConfigurado() {
  return Boolean(CONFIG.supabaseUrl && CONFIG.supabaseChave);
}
