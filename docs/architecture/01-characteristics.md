# Características Arquiteturais Primárias: CoinBridge Gateway

Principais características arquiteturais que direcionam as decisões técnicas do microsserviço **CoinBridge Gateway**.

## 1. Resiliência
**Definição:** A capacidade do sistema de continuar operando e de se recuperar de falhas em integrações externas (como a indisponibilidade da API do PIX) sem perda de dados.
**Como é implementada:**
- Desacoplamento entre recebimento (Webhook) e processamento através de filas.
- Uso de *Workers* assíncronos configurados com políticas de *Retry* e *Exponential Backoff*.
- Prevenção ativa de perdas financeiras em casos de instabilidade da rede.

**Trade-offs:**
- **Complexidade Operacional:** Introduz infraestrutura adicional (Redis) e componentes separados (Workers), tornando o deploy e o monitoramento mais complexos.
- **Consistência Eventual:** O provedor da blockchain recebe um `202 Accepted` imediatamente, mas o pagamento efetivo via PIX ocorre em um momento posterior. É necessário lidar com estados intermediários (`PENDING`, `PROCESSING`).

## 2. Consistência Financeira e Idempotência
**Definição:** A garantia absoluta de que valores monetários são processados com exatidão e que nenhuma transação seja paga/processada mais de uma vez (Double Spending).
**Como é implementada:**
- **Valores em Centavos:** Todo valor monetário trafega e é persistido como número inteiro (centavos).
- **Idempotência Rigorosa:** Implementação de uma restrição `UNIQUE` em banco de dados na coluna `blockchain_tx_id`.

**Trade-offs:**
- **Esforço de Transformação:** Os desenvolvedores precisam lembrar de formatar (multiplicar/dividir por 100) os valores nas bordas do sistema (DTOs de entrada e saída).
- **Tratamento de Exceções de Banco:** A aplicação precisará ser robusta no tratamento de *Unique Constraint Violations* do PostgreSQL.

## 3. Segurança
**Definição:** A proteção do gateway contra requisições fraudulentas e adulteração de payload.
**Como é implementada:**
- Validação estrita do cabeçalho `X-Signature` via HMAC-SHA256 em todas as requisições do webhook.

**Trade-offs:**
- **Gestão de Segredos (Key Management):** Exige um mecanismo seguro para compartilhamento e rotação de chaves simétricas (secret) entre a origem (blockchain/provedor) e o nosso sistema.
- **Overhead Computacional:** O cálculo de *hashes* SHA256 em cada requisição adiciona uma leve carga de processamento na rota de ingresso (Ingress).
