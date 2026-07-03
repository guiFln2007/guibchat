# Como colocar seu ManyChat no ar (passo a passo)

Esse template e o seu proprio sistema de automacao de DMs e comentarios do Instagram.
Tudo gratuito: Supabase (banco), Vercel (hospedagem), Meta API (Instagram).

---

## 1. Instalar no seu computador

Voce precisa ter o Node.js instalado (https://nodejs.org — baixe a versao LTS).

Abra o terminal na pasta do template e rode:
```
npm install
```

## 2. Criar o banco de dados (Supabase)

1. Entre em https://supabase.com e crie uma conta (gratis)
2. Crie um novo projeto (regiao: South America se possivel)
3. Espere o projeto carregar
4. Va em **SQL Editor** (menu lateral) → cole TODO o conteudo do arquivo `supabase/schema.sql` → clique **Run**
5. Va em **Settings → API** e copie:
   - **Project URL** (ex: https://xyzabc.supabase.co)
   - **service_role secret** (a chave que comeca com `eyJ...`)

## 3. Criar o App na Meta (developers.facebook.com)

> Sua conta do Instagram precisa ser **profissional ou creator** (nao pode ser pessoal).

1. Acesse https://developers.facebook.com/apps e crie um app novo → tipo **Business**
2. No app criado, va em **Adicionar produto** → escolha **Instagram → Instagram API with Instagram Login**
3. Anote:
   - **App ID** (topo da pagina)
   - **App Secret** (em Configuracoes → Basico)
   - **Instagram App ID** (em Instagram → Configuracoes basicas)

## 4. Gerar o token do Instagram

No painel do app Meta:
1. Va em **Instagram → API Setup → Generate Access Token**
2. Conecte sua conta do Instagram
3. Copie o **token de acesso** (longo, comeca com `IGAA...`)
4. Anote tambem o **IG User ID** que aparece ali

## 5. Preencher o .env

Copie o `.env.example` pra `.env` e preencha TUDO:

```
META_APP_ID=seu_app_id
INSTAGRAM_APP_ID=seu_instagram_app_id
INSTAGRAM_APP_SECRET=seu_app_secret
IG_USERNAME=seu_arroba_sem_@
IG_USER_ID=seu_ig_user_id
IG_ACCESS_TOKEN=seu_token_longo
OAUTH_REDIRECT_URI=https://seu-app.vercel.app/api/instagram/callback
WEBHOOK_VERIFY_TOKEN=qualquer_palavra_secreta
SESSION_SECRET=cole_algo_aleatorio_aqui
CRON_SECRET=cole_algo_aleatorio_aqui_tambem
SUPABASE_URL=sua_url_do_supabase
SUPABASE_SECRET_KEY=sua_chave_secreta_do_supabase
APP_BASE_URL=https://seu-app.vercel.app
```

Para gerar os segredos aleatorios (SESSION_SECRET e CRON_SECRET), abra o terminal e rode:
```
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```
Rode 2 vezes (um pra cada).

## 6. Criar sua conta de login

Com o .env preenchido, rode no terminal:

```
node scripts/migrate-multitenant.mjs seuemail@gmail.com suasenha123
node scripts/migrate-to-supabase.mjs
```

Esse email/senha e o que voce vai usar pra entrar no painel.

## 7. Testar local

```
npm run dev
```

Acesse http://localhost:3000 e faca login com o email/senha que voce criou.

## 8. Colocar online (Vercel — gratis)

1. Crie uma conta em https://vercel.com
2. No terminal, rode:
```
npx vercel
npx vercel deploy --prod --yes
```
3. No painel da Vercel → seu projeto → **Settings → Environment Variables**:
   - Cole TODAS as variaveis do seu `.env` (uma por uma)
   - Atualize `APP_BASE_URL` e `OAUTH_REDIRECT_URI` com a URL real do deploy

## 9. Configurar o Webhook na Meta

Essa e a parte que faz o Instagram "avisar" seu app quando alguem comenta ou manda DM.

1. No app Meta → **Instagram → Webhooks**
2. **Callback URL:** `https://seu-app.vercel.app/api/webhook`
3. **Verify token:** o mesmo que voce colocou em `WEBHOOK_VERIFY_TOKEN`
4. Assine os campos: **messages**, **messaging_postbacks**, **comments**
5. Publique o app: va em **Configuracoes → Basico** → mude o modo pra **Ao vivo**

## 10. Pronto! Crie sua primeira automacao

Acesse seu painel (a URL da Vercel), faca login, e clique em **Automacao → Nova**.

Configure:
- **Gatilho:** quando alguem comenta com uma palavra-chave (ex: "LINK")
- **Resposta publica:** "Olha teu direct!" (rotativa)
- **Sequencia de DMs:** mensagem de boas-vindas → follow gate → link final

Publique e teste comentando no seu post com a palavra-chave.

---

## Renovacao automatica do token

O token do Instagram expira em 60 dias. O sistema ja renova sozinho todo domingo via Vercel Cron.
Nao precisa fazer nada, so ter o `CRON_SECRET` configurado na Vercel.

## Problemas comuns

- **"Webhook nao verifica"** → confira se a URL esta correta e se o WEBHOOK_VERIFY_TOKEN bate
- **"DM nao envia"** → o app precisa estar no modo "Ao vivo" e ter permissoes de Instagram
- **"Token invalido"** → gere um novo token no painel do app Meta e atualize o .env + Vercel
