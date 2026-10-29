// Supabase de mentira, só para testar as telas no navegador sem o projeto real.
// Guarda tabelas em memória e entende os filtros que o app usa (eq, neq, in, order, limit).
// O teste troca web/compartilhado/vendor/supabase.js por este arquivo.
(function () {
  const agora = new Date().toISOString();
  const papel =
    new URLSearchParams(location.search).get("papel") || localStorage.getItem("teste-papel") || "cliente";
  const EQUIPE = "e0000000-0000-0000-0000-000000000001";
  const CLIENTE = "c0000000-0000-0000-0000-000000000001";
  const EMP = "10000000-0000-0000-0000-000000000001";
  const EMP2 = "10000000-0000-0000-0000-000000000002";
  const uid = papel === "equipe" ? EQUIPE : CLIENTE;
  const id = () => crypto.randomUUID();

  const db = {
    perfis: [
      {
        id: EQUIPE,
        nome: "Paulo Sérgio",
        email: "paulo@locus.test",
        telefone: null,
        papel: "equipe",
        ativo: true,
        trocar_senha: false,
      },
      {
        id: CLIENTE,
        nome: "Carla Mendes",
        email: "carla@mercado.test",
        telefone: "37999990000",
        papel: "cliente",
        ativo: true,
        trocar_senha: false,
      },
    ],
    empresas: [
      {
        id: EMP,
        razao_social: "Mercado Bom Preço Ltda",
        nome_fantasia: "Mercado Bom Preço",
        documento: "11222333000181",
        regime: "simples",
        responsavel_id: EQUIPE,
        ativo: true,
      },
      {
        id: EMP2,
        razao_social: "Padaria Silva ME",
        nome_fantasia: "Padaria Silva",
        documento: "52998224725",
        regime: "mei",
        responsavel_id: EQUIPE,
        ativo: true,
      },
    ],
    empresa_membros: [
      {
        empresa_id: EMP,
        usuario_id: CLIENTE,
        funcao: "socio",
        perfis: { nome: "Carla Mendes", email: "carla@mercado.test", telefone: null, trocar_senha: false },
      },
    ],
    guias: [
      {
        id: id(),
        empresa_id: EMP,
        tipo: "DAS · Simples Nacional",
        descricao: null,
        competencia: "2026-10-01",
        valor_centavos: 405012,
        vencimento: "2026-11-20",
        linha_digitavel: "85810000040-5 50120385202-6 61120002026-1 09120003213-4",
        pix_copia_cola: "00020126580014br.gov.bcb.pix",
        caminho: "x/guias/das.pdf",
        status: "a_pagar",
        pago_em: null,
        publicado_em: agora,
      },
      {
        id: id(),
        empresa_id: EMP,
        tipo: "FGTS Digital",
        descricao: null,
        competencia: "2026-10-01",
        valor_centavos: 78400,
        vencimento: "2026-11-20",
        linha_digitavel: null,
        pix_copia_cola: null,
        caminho: null,
        status: "a_pagar",
        pago_em: null,
        publicado_em: agora,
      },
      {
        id: id(),
        empresa_id: EMP,
        tipo: "DAS · Simples Nacional",
        descricao: null,
        competencia: "2026-09-01",
        valor_centavos: 400000,
        vencimento: "2026-10-20",
        linha_digitavel: null,
        pix_copia_cola: null,
        caminho: null,
        status: "paga",
        pago_em: agora,
        publicado_em: agora,
      },
    ],
    documentos: [
      {
        id: id(),
        empresa_id: EMP,
        enviado_por: CLIENTE,
        categoria: "extrato",
        descricao: "Conta Sicoob",
        competencia: "2026-09-01",
        caminho: "x/documentos/a.pdf",
        nome_arquivo: "Extrato Sicoob setembro.pdf",
        tamanho_bytes: 1000,
        status: "recebido",
        criado_em: agora,
      },
    ],
    entregas: [
      {
        id: id(),
        empresa_id: EMP,
        categoria: "diagnostico",
        titulo: "Painel de setembro",
        competencia: "2026-09-01",
        caminho: "x/entregas/p.xlsx",
        nome_arquivo: "painel.xlsx",
        publicado_em: agora,
      },
      {
        id: id(),
        empresa_id: EMP,
        categoria: "balancete",
        titulo: "Balancete de setembro",
        competencia: "2026-09-01",
        caminho: "x/entregas/b.pdf",
        nome_arquivo: "balancete.pdf",
        publicado_em: agora,
      },
    ],
    chamados: [
      {
        id: "20000000-0000-0000-0000-000000000001",
        empresa_id: EMP,
        aberto_por: CLIENTE,
        categoria: "ferias",
        assunto: "Férias · João Pereira",
        dados: { nome: "João Pereira", inicio: "2026-12-01", dias: "30" },
        status: "em_atendimento",
        responsavel_id: EQUIPE,
        criado_em: agora,
        atualizado_em: agora,
      },
    ],
    chamado_mensagens: [
      {
        id: id(),
        chamado_id: "20000000-0000-0000-0000-000000000001",
        autor_id: CLIENTE,
        texto: "Pode programar para dezembro?",
        criado_em: agora,
      },
      {
        id: id(),
        chamado_id: "20000000-0000-0000-0000-000000000001",
        autor_id: EQUIPE,
        texto: "Pode sim, já estamos preparando o aviso de férias.",
        criado_em: agora,
      },
    ],
    prazos: [
      {
        id: id(),
        empresa_id: EMP,
        titulo: "DCTFWeb de outubro",
        vencimento: "2026-11-14",
        status: "pendente",
        responsavel_id: EQUIPE,
        concluido_em: null,
      },
    ],
    avisos: [
      {
        id: id(),
        empresa_id: EMP,
        titulo: "Nova guia: DAS · Simples Nacional",
        corpo: "Vence em 20/11/2026.",
        destino: "guias",
        criado_em: agora,
      },
      {
        id: id(),
        empresa_id: EMP,
        titulo: "Painel atualizado",
        corpo: "Painel de setembro",
        destino: "painel",
        criado_em: agora,
      },
    ],
    avisos_lidos: [],
    contatos_site: [
      {
        id: id(),
        nome: "Maria Souza",
        empresa: "Ateliê da Maria",
        telefone: "37988887777",
        email: null,
        interesse: "Diagnóstico gratuito",
        mensagem: "Sou MEI e quero virar ME.",
        origem: "diagnostico",
        status: "novo",
        criado_em: agora,
      },
    ],
  };

  function consulta(tabela) {
    const filtros = [];
    let ordem = null;
    let limite = null;
    let modo = "lista";
    let acao = null;
    let carga = null;
    let opcoesSelect = {};
    const q = {
      select(_c, opcoes) {
        opcoesSelect = opcoes || {};
        return q;
      },
      eq(c, v) {
        filtros.push((l) => String(l[c]) === String(v));
        return q;
      },
      neq(c, v) {
        filtros.push((l) => String(l[c]) !== String(v));
        return q;
      },
      in(c, vs) {
        filtros.push((l) => vs.includes(l[c]));
        return q;
      },
      order(c, o) {
        ordem = [c, o && o.ascending === false ? -1 : 1];
        return q;
      },
      limit(n) {
        limite = n;
        return q;
      },
      single() {
        modo = "um";
        return q;
      },
      maybeSingle() {
        modo = "talvez";
        return q;
      },
      insert(v) {
        acao = "insert";
        carga = v;
        return q;
      },
      update(v) {
        acao = "update";
        carga = v;
        return q;
      },
      upsert(v) {
        acao = "insert";
        carga = v;
        return q;
      },
      then(ok, falha) {
        return Promise.resolve(executar()).then(ok, falha);
      },
    };
    function executar() {
      const linhas = db[tabela] || (db[tabela] = []);
      if (acao === "insert") {
        const novas = (Array.isArray(carga) ? carga : [carga]).map((c) => ({
          id: id(),
          criado_em: agora,
          atualizado_em: agora,
          publicado_em: agora,
          status:
            tabela === "documentos"
              ? "recebido"
              : tabela === "guias"
                ? "a_pagar"
                : tabela === "chamados"
                  ? "aberto"
                  : undefined,
          autor_id: uid,
          ...c,
        }));
        linhas.push(...novas);
        return { data: modo === "lista" ? novas : novas[0], error: null };
      }
      let r = linhas.filter((l) => filtros.every((f) => f(l)));
      if (acao === "update") {
        r.forEach((l) => Object.assign(l, carga));
        return { data: r[0] || null, error: null };
      }
      if (ordem) r = [...r].sort((a, b) => (a[ordem[0]] > b[ordem[0]] ? 1 : -1) * ordem[1]);
      if (limite) r = r.slice(0, limite);
      if (opcoesSelect.head) return { data: null, count: r.length, error: null };
      if (modo === "um")
        return r[0] ? { data: r[0], error: null } : { data: null, error: { message: "not found" } };
      if (modo === "talvez") return { data: r[0] || null, error: null };
      return { data: r, error: null, count: r.length };
    }
    return q;
  }

  window.supabase = {
    createClient() {
      return {
        from: consulta,
        rpc: async (nome, args) => {
          if (nome === "marcar_guia_paga") {
            const g = db.guias.find((x) => x.id === args.p_guia);
            g.status = args.p_paga ? "paga" : "a_pagar";
          }
          return { data: null, error: null };
        },
        auth: {
          getSession: async () => ({ data: { session: { user: { id: uid } } } }),
          signInWithPassword: async () => ({ error: null }),
          signOut: async () => ({ error: null }),
          updateUser: async () => ({ error: null }),
          resetPasswordForEmail: async () => ({ error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        },
        storage: {
          from: () => ({
            upload: async () => ({ error: null }),
            remove: async () => ({ error: null }),
            createSignedUrl: async () => ({ data: { signedUrl: "about:blank" }, error: null }),
            download: async () => ({ data: new Blob(["x"]), error: null }),
          }),
        },
        functions: {
          invoke: async () => ({
            data: { usuario_id: id(), ja_existia: false, senha_provisoria: "Kp7mQx3vRt2a" },
            error: null,
          }),
        },
      };
    },
  };
})();
