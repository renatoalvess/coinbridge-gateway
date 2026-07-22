# CoinBridge Gateway — Crypto to PIX

O **CoinBridge Gateway** é um gateway de pagamentos assíncrono projetado para atuar como ponte entre redes Blockchain e o sistema financeiro tradicional brasileiro (PIX). 

Ele recebe notificações de depósito de criptomoedas estáveis (ex: USDT/USDC via Webhook), enfileira as requisições com segurança, realiza a conversão de moedas em background e efetua o repasse em Reais (BRL) para a conta do Lojista (Merchant) via PIX.

O projeto utiliza **Node.js (TypeScript)**, **Fastify**, **Prisma ORM (PostgreSQL)** e **BullMQ (Redis)**, seguindo os princípios de **Clean Architecture** (Arquitetura Limpa).

Projeto arquitetado e desenvolvido utilizando o [Spec Kit](https://github.com/github/spec-kit).

---

## Principais Funcionalidades

- **Clean Architecture Estrita:** O domínio é totalmente isolado da infraestrutura (Fastify/Redis).
- **Processamento Assíncrono:** Para garantir que a Blockchain não fique aguardando processos lentos do banco central, a API responde `202 Accepted` de imediato e o repasse Pix acontece no **Worker** em background.
- **Idempotência (Proteção contra Double Spending):** Garante que o mesmo `blockchainTxId` jamais gere dois Pix para o lojista, mesmo que a Blockchain mande o Webhook 10 vezes no mesmo segundo.
- **Resiliência e Retentativas:** Uso do **BullMQ** com *Exponential Backoff*. Se a API do Banco Central cair, o dinheiro não se perde. O sistema agenda para tentar novamente mais tarde.
- **Cotação em Tempo Real (Crypto FX):** Converte a moeda (ex: USDT) para Reais (BRL) usando a cotação exata do momento do repasse através de integração direta e gratuita com a API da Coinbase.
- **Webhooks de Saída (Outbound Webhooks):** Ao finalizar o Pix (com sucesso ou falha), um segundo Worker do BullMQ notifica o Lojista via HTTP informando o status, e retenta automaticamente caso o servidor dele esteja fora do ar.
- **Segurança (HMAC-SHA256):** Apenas webhooks com assinaturas válidas usando chaves criptográficas secretas são processados.

---

## Tecnologias Utilizadas

- **Runtime:** Node.js (v20+) com TypeScript
- **Framework Web:** Fastify
- **Filas e Jobs:** BullMQ + Redis
- **ORM:** Prisma ORM (`@prisma/adapter-pg`)
- **Banco de Dados:** PostgreSQL e Redis (via Docker Compose)
- **Testes:** Vitest

---

## Estrutura do Projeto

```text
docs/
└── architecture/            # Documentação detalhada e ADRs de Arquitetura
src/
├── domain/                  # Regras de Negócio e Entidades
├── application/             # Casos de Uso e Interfaces
├── infrastructure/          # Detalhes de entrega:
│   ├── database/            # Prisma Client, Repositórios e Seed
│   ├── http/                # Controllers (Webhooks) e Fastify
│   ├── pix/                 # Implementações Falsas/Reais de APIs bancárias
│   ├── queue/               # Adapters do BullMQ
│   └── workers/             # Processos em Background (Worker Node)
└── lib/                     # Utilitários e validação de Variáveis de Ambiente
```

---

## Arquitetura do Sistema

Documentação detalhada sobre características arquiteturais, decisões de projeto (ADRs) e diagramas estão disponíveis na pasta [`docs/architecture/`](docs/architecture/).

Diagrama de arquitetura criado com [IcePanel](https://icepanel.io/):

### Diagrama de Contêineres
Detalha a arquitetura interna distribuída.

![Diagrama de Contêineres](docs/architecture/assets/CoinBridge_Gateway_App_Diagram.png)

---

## Como Instalar e Rodar Localmente

### 1. Preparando o Ambiente
Você precisará de **Node.js (20+)**, **pnpm** e **Docker** instalados.

1. Clone o repositório e instale os pacotes:
   ```bash
   pnpm install
   ```

2. Crie o seu arquivo `.env` na raiz:
   ```env
   DATABASE_URL="postgresql://root:rootpassword@localhost:5433/coinbridge?schema=public"
   REDIS_URL="redis://localhost:6379"
   WEBHOOK_SECRET="super-secret-key-for-webhook"
   PORT=3001
   ```

3. Suba os containers do PostgreSQL e do Redis:
   ```bash
   docker-compose up -d
   ```

### 2. Configurando o Banco de Dados
Gere as tabelas e crie o Merchant de Testes:

```bash
pnpm prisma migrate dev
npx prisma db seed
```
*(O Seed irá criar automaticamente o Merchant com ID `merchant-test-123` e limpar transações antigas)*.

### 3. Subindo a Aplicação
O Gateway é dividido em dois processos que devem rodar simultaneamente em terminais separados.

**Terminal 1 - O Gateway (API Fastify):**
```bash
pnpm dev
```
A API rodará em `http://localhost:3001` e a documentação interativa no Scalar em `http://localhost:3001/docs`.

**Terminal 2 - O Worker (Fila BullMQ):**
```bash
pnpm worker
```

---

## Como Testar as Requisições (Simulando a Blockchain)

### Pelo Terminal (Curl)
```bash
curl -i -X POST http://localhost:3001/v1/webhooks/blockchain \
  -H "Content-Type: application/json" \
  -H "x-signature: bypass" \
  -d '{"merchantId":"merchant-test-1234","blockchainTxId":"tx-001","amount":5000,"currency":"USDT"}'
```

## Insigths de Testes: Simulando Erros no Mundo Real

A API sempre responderá HTTP `202 Accepted` por ser assíncrona. Para testar a arquitetura, modifique o arquivo `src/infrastructure/pix/fake-pix-provider.ts` e veja como o sistema se defende contra os dois tipos de falha mais comuns do mercado financeiro:

### Cenário 1: Falha de Negócio (Ex: Banco Rejeitou o Pix)
Se o provedor PIX disser "Chave inválida", a transação deve ser marcada como **FAILED**.
- Vá no `fake-pix-provider.ts` e force: `const isBusinessFailure = true;`
- Reinicie o worker (`Ctrl+C` e `pnpm worker`).
- Envie a requisição. O log dirá `Job processed successfully`.
- **Verifique o Banco de Dados:** Rode o comando `npx tsx src/infrastructure/database/prisma/check-txs.ts`. Você verá que a transação mudou para o status **FAILED**.

### Cenário 2: Erro Temporário (Ex: API do Banco Fora do Ar)
Se o sistema do banco cair, o Worker não pode dar o caso como perdido, ele precisa ficar tentando até o banco voltar.
- Vá no `fake-pix-provider.ts` e force: `const isNetworkError = true;` (e `isBusinessFailure = false;`).
- Reinicie o worker e dispare o Webhook.
- Você verá no terminal: `Job failed with error: Temporary Network Error`. Mas logo em seguida, o BullMQ aplicará o Exponential Backoff, escrevendo: `Processing job... (Attempt 2)`. Ele tentará várias vezes até você corrigir o código.

---

## Inspecionando o Banco de Dados Pelo Terminal
Como o Prisma Studio pode causar problemas de port-forwarding local, foi criado um atalho rápido para ver a saúde das últimas transações no banco de dados. Basta rodar:

```bash
npx tsx src/infrastructure/database/prisma/check-txs.ts
```
Imprimirá uma tabela visual no próprio console com os IDs e os Status (SUCCESS, FAILED, PENDING).

---

## Testando os Webhooks de Saída (Callback para Lojistas)

O sistema notifica o lojista automaticamente sempre que uma transação for completada (com sucesso ou falha). Para testar isso:

1. Acesse [Webhook.site](https://webhook.site/) e copie a "Unique URL" que será gerada automaticamente na sua tela.
2. Abra o arquivo `src/infrastructure/database/prisma/seed.ts` e substitua a `callbackUrl` de teste pela sua URL copiada.
3. Atualize seu banco de dados rodando: `npx prisma db seed`.
4. Garanta que o terminal do Worker (`pnpm worker`) esteja rodando.
5. Faça o disparo de uma transação pela porta 3001 via terminal (curl) ou pelo Bruno.
6. Volte no seu navegador na aba do **Webhook.site**! Você verá em tempo real a requisição HTTP POST chegar com o payload da transação (ex: `"status": "SUCCESS"`) e o cabeçalho `x-signature` gerado com HMAC.
