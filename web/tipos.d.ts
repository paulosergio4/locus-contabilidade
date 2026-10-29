// Tipos usados na checagem do JavaScript (npm run tipos). Não vão para o navegador.
// Espelham as tabelas de supabase/migrations: ao mudar uma tabela, atualize aqui.

export type ClienteSupabase = import("@supabase/supabase-js").SupabaseClient;

export type Papel = "equipe" | "cliente";

export interface Perfil {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  papel: Papel;
  ativo: boolean;
  trocar_senha: boolean;
}

export interface Empresa {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  documento: string;
  regime: "mei" | "simples" | "presumido" | "real" | "pessoa_fisica" | "outro";
  responsavel_id: string | null;
  ativo: boolean;
}

export interface Guia {
  id: string;
  empresa_id: string;
  tipo: string;
  descricao: string | null;
  competencia: string;
  valor_centavos: number;
  vencimento: string;
  linha_digitavel: string | null;
  pix_copia_cola: string | null;
  caminho: string | null;
  status: "a_pagar" | "paga" | "cancelada";
  pago_em: string | null;
  publicado_em: string;
}

export interface Documento {
  id: string;
  empresa_id: string;
  enviado_por: string | null;
  categoria: "extrato" | "nota_compra" | "nota_venda" | "folha" | "contrato" | "outro";
  descricao: string | null;
  competencia: string | null;
  caminho: string;
  nome_arquivo: string;
  tamanho_bytes: number | null;
  status: "recebido" | "em_analise" | "processado" | "recusado";
  criado_em: string;
}

export interface Entrega {
  id: string;
  empresa_id: string;
  categoria: "diagnostico" | "balancete" | "dre" | "folha" | "contrato" | "certidao" | "outro";
  titulo: string;
  competencia: string | null;
  caminho: string;
  nome_arquivo: string;
  publicado_em: string;
}

export interface Chamado {
  id: string;
  empresa_id: string;
  aberto_por: string | null;
  categoria: "admissao" | "rescisao" | "ferias" | "duvida" | "outro";
  assunto: string;
  dados: Record<string, string>;
  status: "aberto" | "em_atendimento" | "aguardando_cliente" | "resolvido";
  responsavel_id: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface Mensagem {
  id: string;
  chamado_id: string;
  autor_id: string | null;
  texto: string;
  criado_em: string;
}

export interface Prazo {
  id: string;
  empresa_id: string | null;
  titulo: string;
  vencimento: string;
  status: "pendente" | "concluido";
  responsavel_id: string | null;
  concluido_em: string | null;
}

export interface Aviso {
  id: string;
  empresa_id: string;
  titulo: string;
  corpo: string | null;
  destino: string | null;
  criado_em: string;
}

export interface ContatoSite {
  id: string;
  nome: string;
  empresa: string | null;
  telefone: string | null;
  email: string | null;
  interesse: string | null;
  mensagem: string | null;
  origem: "contato" | "diagnostico" | "simulador";
  status: "novo" | "em_contato" | "virou_cliente" | "descartado";
  criado_em: string;
}

declare global {
  // Biblioteca do Supabase carregada como script comum (web/compartilhado/vendor/supabase.js).
  var supabase: typeof import("@supabase/supabase-js");
  // Leitor de planilhas usado pelo painel (SheetJS).
  var XLSX: any;
}
