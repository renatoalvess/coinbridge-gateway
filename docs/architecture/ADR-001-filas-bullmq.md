# ADR 001: Adoção de Processamento Assíncrono com Redis e BullMQ para Transferências PIX

## Status
Aceito (Accepted)

## Contexto
O **CoinBridge Gateway** atua como uma ponte que recebe notificações de depósitos feitos na blockchain (USDT/USDC) através de um *Webhook* e efetua a liquidação desses valores na moeda local via pagamentos **PIX**. 

Durante o recebimento do Webhook, o provedor PIX externo pode estar passando por:
- Indisponibilidade temporária (downtime).
- Latência alta (timeouts).
- Rate limits.

Se processássemos a transação de forma **síncrona** (diretamente dentro do controller/rota do webhook):
1. **Risco de Falha em Cascata:** Uma falha no provedor PIX forçaria nossa API a retornar um erro 5xx para a blockchain.
2. **Esgotamento de Recursos:** Requisições demoradas (devido à latência do PIX) ocupariam conexões abertas no servidor Node.js/Fastify, potencialmente derrubando a API em momentos de pico.
3. **Perda de Rastreabilidade:** Em caso de erro, seria mais difícil recuperar e reprocessar o pagamento sem depender das retentativas imprevisíveis do provedor de origem.

## Decisão
Arquitetura de **processamento assíncrono baseada em filas**, utilizando o **Redis** como *broker* de mensagens em conjunto com a biblioteca **BullMQ** no ecossistema Node.js.

- O Webhook HTTP (Ingress) fará apenas a validação de segurança (HMAC-SHA256), a persistência inicial da transação (status `PENDING`) no PostgreSQL e despachará um *Job* para a fila do BullMQ, retornando imediatamente um `202 Accepted`.
- Um *Worker* separado do fluxo da API consumirá essa fila de forma independente, realizando a chamada para a simulação do PIX.
- Utilizaremos os recursos nativos do BullMQ de **Retries** e **Exponential Backoff** para lidar com instabilidades do provedor PIX.
