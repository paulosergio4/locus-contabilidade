/**
 * Service worker do app (o que permite instalar no celular e no computador).
 * Guarda os arquivos do app para abrir rápido e sem internet.
 * Os dados (guias, documentos) nunca ficam aqui: vêm sempre do Supabase.
 * Ao mudar qualquer arquivo do app, aumente a VERSAO para os aparelhos atualizarem.
 */
const VERSAO = "locus-app-v1";
const ARQUIVOS = [
  "./",
  "./index.html",
  "./css/app.css",
  "./manifest.webmanifest",
  "./icones/icone-192.png",
  "./js/main.js",
  "./js/estado.js",
  "./js/navegacao.js",
  "./js/componentes.js",
  "./js/rotulos.js",
  "./js/selos.js",
  "./js/telas/login.js",
  "./js/telas/inicio.js",
  "./js/telas/guias.js",
  "./js/telas/enviar.js",
  "./js/telas/painel.js",
  "./js/telas/chamados.js",
  "./js/telas/arquivo.js",
  "./js/telas/perfil.js",
  "./js/telas/equipe-clientes.js",
  "./js/telas/equipe-entrada.js",
  "./js/telas/equipe-publicar.js",
  "./js/telas/equipe-prazos.js",
  "./js/telas/equipe-contatos.js",
  "../compartilhado/vendor/supabase.js",
  "../compartilhado/js/config.js",
  "../compartilhado/js/supabase.js",
  "../compartilhado/js/html.js",
  "../compartilhado/js/formatos.js",
  "../compartilhado/js/sessao.js",
  "../compartilhado/js/arquivos.js",
  "../compartilhado/js/icones.js",
  "../compartilhado/js/ui.js",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(caches.open(VERSAO).then((cache) => cache.addAll(ARQUIVOS)));
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n)))),
  );
  self.clients.claim();
});

// Arquivos do próprio app: tenta a rede primeiro (para pegar a versão nova) e usa a cópia
// guardada se estiver sem internet. Pedidos para outros endereços (Supabase) passam direto.
self.addEventListener("fetch", (evento) => {
  const url = new URL(evento.request.url);
  if (evento.request.method !== "GET" || url.origin !== self.location.origin) return;
  evento.respondWith(
    fetch(evento.request)
      .then((resposta) => {
        if (resposta.ok) {
          const copia = resposta.clone();
          caches.open(VERSAO).then((cache) => cache.put(evento.request, copia));
        }
        return resposta;
      })
      .catch(() => caches.match(evento.request).then((r) => r ?? caches.match("./index.html"))),
  );
});
