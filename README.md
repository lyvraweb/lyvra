
# Lyvra — Project Boilerplate (Zero-cost launch)

Este repositório contém uma versão mínima do projeto **Lyvra** pronta para deploy em Vercel/Netlify, usando Firebase Auth/Firestore e Stripe Checkout (modo test).

## Conteúdo
- `index.html` — sua landing (modificada)
- `planos.html` — página de planos (modificada)
- `login.html` — login via Google (Firebase)
- `checkout.html` — checkout simples (cria sessão Stripe)
- `app.html` — painel mínimo (aplica quotas)
- `api/create-checkout-session.js` — serverless endpoint para criar sessão Stripe
- `api/stripe-webhook.js` — serverless webhook para atualizar plano no Firestore
- `package.json` — dependências para serverless (Vercel)
- `README.md` — este arquivo

## Passo a passo para deploy (recomendado: Vercel)
1. Suba este diretório para um repositório no GitHub.
2. Crie um novo projeto no Vercel apontando para o repositório.
3. Configure as variáveis de ambiente no Vercel (Settings > Environment Variables):
   - `STRIPE_SECRET_KEY` = sua Stripe Secret Key (test)
   - `STRIPE_PRICE_PRO` = price id para Pro (criado no Stripe Dashboard)
   - `STRIPE_PRICE_BUSINESS` = price id para Business
   - `APP_URL` = https://<seu-dominio-vercel>
   - `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID` = valores do Firebase (client SDK) - usados no frontend
   - `FIREBASE_SERVICE_ACCOUNT` = JSON da service account (stringified) para o admin SDK (usado no webhook)
   - `STRIPE_WEBHOOK_SECRET` = o secret do webhook (crie webhook apontando para https://<seu-app>/api/stripe-webhook)
4. No Stripe: crie Products & Prices (modo Test), copie os Price IDs e configure nas vars acima.
5. Configure o webhook no Stripe apontando para `https://<seu-app>/api/stripe-webhook` e copie o secret (`STRIPE_WEBHOOK_SECRET`) para o Vercel.
6. Configure Firebase:
   - Auth > Sign-in method > Google (ativar)
   - Firestore > criar coleção `users`
7. Deploy no Vercel. Após deploy:
   - Acesse `/planos.html` para testar o fluxo.
   - Use o modo Test do Stripe para simular pagamentos.

## Observações importantes
- No frontend os placeholders `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID` devem ser substituídos pelas suas vars de ambiente (ou injetadas no deploy).
- Apple Sign-In não está incluído — pode ser adicionado depois.
- O webhook espera a `FIREBASE_SERVICE_ACCOUNT` no formato JSON string (use JSON.stringify no Vercel var).
- Este é um boilerplate mínimo; proteja regras do Firestore antes de abrir ao público.

## Próximos passos sugeridos (eu posso guiar)
- Ajustar copy final nas seções específicas (posso gerar blocos de HTML para colar).
- Configurar Make.com flow para automação de geração de conteúdo via OpenAI/ElevenLabs/OpusClip.
- Gerar 3 demos usando a Lyvra para publicar nas redes sociais.
- Implementar upgrade in-app (assinaturas recorrentes e cancelamento).

