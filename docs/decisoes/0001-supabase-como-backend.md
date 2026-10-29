# 0001 · Supabase como backend

**Data:** 29/10/2026 · **Situação:** aceita

## Contexto

O escritório precisa abrir com login real, arquivos de clientes e avisos, sem servidor próprio para manter
agora, e com caminho aberto para um servidor próprio no futuro.

## Decisão

Usar o Supabase (plano gratuito no começo): PostgreSQL, Auth, Storage e funções, na região São Paulo.

## Por quê

- É PostgreSQL padrão: dá para levar o banco para um servidor próprio com `pg_dump`.
- As regras de acesso ficam no próprio banco (RLS), testadas em `testes/banco/`.
- Login, links temporários de arquivos e funções de servidor já vêm prontos.

## Consequências

- Os limites do plano gratuito valem até migrar para o pago (armazenamento e projeto pausado por inatividade).
- O e-mail precisa de SMTP próprio antes de abrir (ver guia rápido).
