# 0005 · Acesso do cliente por senha provisória

**Data:** 29/10/2026 · **Situação:** aceita

## Decisão

A equipe cria o login do cliente pela função `convidar-usuario` no modo "senha": o sistema gera uma senha
provisória, a equipe manda no WhatsApp e o cliente troca no primeiro acesso (`perfis.trocar_senha`).
O cadastro aberto fica desligado.

## Por quê

- O cliente da Lócus usa mais WhatsApp que e-mail.
- Funciona antes de configurar o SMTP.
- Ninguém de fora consegue criar conta sozinho.

## Depois

Com SMTP configurado, a mesma função aceita o modo "convite" (link por e-mail).
