# 💰 FinApp Backend

> Uma API robusta para gestão financeira pessoal construída com **Node.js**, **NestJS**, e **Drizzle ORM**, focada em escalabilidade, manutenibilidade e performance cirúrgica.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![NestJS](https://img.shields.io/badge/nestjs-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-729B1B?style=for-the-badge&logo=vitest&logoColor=white)

## 🎯 Sobre o Projeto

O **FinApp Backend** é o motor que alimenta um ecossistema financeiro. Construído a partir de uma arquitetura rigorosa de **Vertical Slicing**, cada domínio da aplicação vive de forma independente, garantindo que o software permaneça ágil ("Easy to Change") conforme a aplicação cresce. Todo o fluxo de desenvolvimento é guiado por **TDD** (Test-Driven Development), assegurando zero quebras em refatorações (com dezenas de testes de integração e E2E auto-limpantes).

## 🚀 Funcionalidades Principais

- 🔐 **Autenticação Avançada:** Baseada em [Better Auth](https://better-auth.com/), totalmente tipada e segura.
- 💼 **Gestão de Carteiras (Wallets):** Gerencie de onde o dinheiro entra e sai.
- 🏷️ **Categorização de Gastos:** Rotule as despesas/receitas com customização de cores e ícones.
- 💳 **Transações (Transactions):** Registro detalhado de despesas e receitas. Valores trafegam sempre em **centavos** (evitando problemas de flutuação de moedas).
- 🎯 **Metas e Orçamentos (Goals):** Defina o limite de gastos em % para cada categoria (Ex: "30% para Alimentação") impedindo metas logicamente inválidas (soma > 100%).
- 📊 **Relatórios Otimizados:** O endpoint mensal processa complexas agregações e métricas (`Ideal vs Real`) nativamente no Postgres via `json_agg` e retorna tudo mastigado em um só JSON, exigindo processamento zero do Frontend/Mobile.

## 🏗️ Arquitetura

Nós seguimos as diretrizes do arquivo raiz `AGENTS.md`:
1. **Isolamento de Domínio (Vertical Slicing):** Pastas organizadas por _feature_ (Ex: `src/modules/wallets`), e nunca separadas horizontalmente (ex: sem pasta global de `controllers`).
2. **SRP & DRY:** Lógica pesada estritamente nos Services, Controllers enxutos e reaproveitamento de código em utilitários (`src/common`).
3. **Database Proximity:** O arquivo de declaração da tabela (`*.schema.ts`) convive ao lado do código de negócio que a utiliza.

## 🛠️ Tecnologias Utilizadas

- **Framework:** NestJS (Node.js)
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **Authentication:** Better Auth (com `@better-auth/cli`)
- **Testes (Unitários & E2E):** Vitest + Supertest
- **Ambiente:** WSL / Linux Nativo

## 💻 Como Rodar o Projeto (Local)

### 1. Pré-requisitos
- Node.js `20+`
- PostgreSQL rodando local ou em container (Docker).
- WSL (caso desenvolva no Windows).

### 2. Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto com os seguintes dados:
```env
DATABASE_URL="postgres://usuario:senha@localhost:5432/finapp_db"
BETTER_AUTH_SECRET="sua_chave_secreta_super_segura"
BETTER_AUTH_URL="http://localhost:3000"
```

### 3. Instalação & Setup de Banco
Abra seu terminal bash e rode:
```bash
# Instalar dependências
npm install

# Enviar os Schemas do Drizzle para o PostgreSQL
npx drizzle-kit push
```

### 4. Rodar o Servidor
```bash
# Modo de desenvolvimento com Hot-Reload
npm run start:dev
```

### 5. Rodar os Testes
Para confirmar a resiliência arquitetural do código:
```bash
# Testes Unitários
npm run test

# Testes E2E (End-to-End)
npm run test:e2e
```

---
*Feito com excelência, visando ser a base sólida do seu app de finanças pessoal.* 🚀
