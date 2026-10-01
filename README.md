# Agenda Digital – Reserva do Laboratório

Site estático (HTML/CSS/JS) + funções serverless na Vercel (`/api`) + banco Supabase + e-mails via Resend.

## 1. Banco de dados (Supabase – grátis)
1. Crie uma conta em https://supabase.com e um projeto novo.
2. Vá em **SQL Editor → New query**, cole o conteúdo de `schema.sql` e clique em **Run**.
3. Em **Project Settings → API**, copie:
   - **Project URL** → `SUPABASE_URL`
   - **service_role key** → `SUPABASE_SERVICE_KEY` (secreta! nunca coloque no código)

## 2. E-mail (Resend – grátis)
1. Crie conta em https://resend.com (use o MESMO e-mail onde quer receber os avisos).
2. **API Keys → Create API Key** → `RESEND_API_KEY`.
3. Sem domínio próprio, o Resend só envia para o e-mail da sua conta – é exatamente o seu caso.

## 3. Variáveis na Vercel
Projeto → **Settings → Environment Variables**, adicione:

| Nome | Valor |
|---|---|
| `SUPABASE_URL` | URL do projeto |
| `SUPABASE_SERVICE_KEY` | service_role key |
| `JWT_SECRET` | qualquer frase longa e aleatória |
| `RESEND_API_KEY` | chave do Resend |
| `EMAIL_DESTINO` | **o seu e-mail** (vários: separe por vírgula) |

Depois faça **Redeploy**.

## 4. Subir
Envie todos os arquivos para o GitHub (na raiz do repositório, incluindo a pasta `api/` e o `package.json`). A Vercel instala as dependências sozinha.

## Você recebe e-mail quando
- alguém cria uma conta; alguém faz uma reserva; alguém cancela uma reserva.
