# Guia rápido

> Situação em 29/10/2026: projeto `locus-contabilidade` criado na organização Lócus (região São Paulo,
> ref `cksyhdpqxxrxyjwsprgj`), migrações aplicadas, função `convidar-usuario` publicada, cadastro aberto
> desligado e URLs do app configuradas. Falta criar o repositório no GitHub e o primeiro login da equipe.

## 1. Ligar o Supabase

1. Criar o projeto na organização Lócus, região São Paulo (`sa-east-1`).
2. Aplicar as migrações de `supabase/migrations/` em ordem.
3. Publicar a função `supabase/functions/convidar-usuario`. Se a função recusar o login da equipe
   (erro 401 "Invalid JWT"), desligue "Verify JWT with legacy secret" nas configurações dela: o login
   já é conferido dentro do código.
4. Copiar a URL do projeto e a chave publicável para `web/compartilhado/js/config.js`.
5. Em Authentication → URL Configuration, colocar o endereço do app em **Site URL** e em
   **Redirect URLs** (por exemplo `https://paulosergio4.github.io/locus-contabilidade/app/`).
6. Em Authentication → Sign In / Providers, **desligar o cadastro aberto** ("Allow new users to sign up"):
   só a equipe cria acessos.

## 2. Primeiro acesso da equipe

1. Em Authentication → Users → Add user, criar o seu usuário com e-mail e senha.
2. No SQL Editor: `update public.perfis set papel = 'equipe', nome = 'Seu nome' where email = 'seu@email';`
3. Entrar no app. A partir daí, novos clientes são cadastrados pela própria área da equipe.

## 3. Dar acesso a um cliente

Clientes → cadastrar a empresa → abrir a ficha → **Dar acesso ao app**. O app gera uma senha provisória e
um texto pronto para o WhatsApp. No primeiro acesso a pessoa escolhe a senha dela.

## 4. E-mails (recuperar senha)

O envio de e-mail padrão do Supabase só funciona para os membros da organização e tem limite baixo.
Antes de abrir, configure um SMTP próprio (Authentication → Emails → SMTP), por exemplo com o e-mail
do domínio da Lócus ou um serviço de envio. Até lá, a recuperação de senha é feita pela equipe, criando
uma senha provisória nova.

## 5. Publicar

Cada envio para a branch `main` publica a pasta `web/` no GitHub Pages
(`.github/workflows/publicar.yml`). No GitHub: Settings → Pages → Source: **GitHub Actions**.

## 6. Domínio próprio

Quando tiver o domínio (por exemplo `locuscontabilidade.com.br`), configure em Settings → Pages →
Custom domain e atualize `urlApp` em `config.js` e as URLs do passo 1.5.
