# 0004 · App instalável (PWA) em vez de loja de aplicativos

**Data:** 29/10/2026 · **Situação:** aceita

## Decisão

O app é um PWA: manifesto + service worker. O cliente abre o link e instala no celular (Android ou iPhone)
e no computador, sem Play Store ou App Store.

## Por quê

- Sem custo nem espera de aprovação das lojas.
- Uma atualização no site chega para todo mundo na hora.

## Quando rever

Se precisar de recurso que o PWA não tem no iPhone (por exemplo, certas notificações), empacotar o mesmo
código com Capacitor e publicar nas lojas.
