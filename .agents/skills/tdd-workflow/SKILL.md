---
name: tdd-workflow
description: Garante o uso de Test-Driven Development (TDD) na construção de novas features. Obriga a criação de testes de falha e de sucesso ANTES da implementação da regra de negócio. Use sempre que o usuário pedir para criar uma feature, módulo, rota ou funcionalidade nova.
---

# 🧪 TDD Workflow Skill

Esta skill força o agente a adotar a metodologia **Test-Driven Development (TDD)** de forma estrita para qualquer nova funcionalidade. A arquitetura de qualidade do `fin-app-backend` exige que a base de testes seja nosso documento vivo.

## 🛠 Como Operar sob esta Skill

Sempre que você for encarregado de criar uma feature nova (ou o usuário disser "vamos usar TDD", "crie a feature X com a skill de TDD"), você **NÃO DEVE escrever o código de produção primeiro**. Siga obrigatoriamente as fases abaixo:

### Fase 1: RED (Testes Falhando)
Antes de tocar nos arquivos `*.controller.ts` ou `*.service.ts` para criar a lógica, você deve escrever a suíte de testes (`*.spec.ts` ou `*.e2e-spec.ts`).

A ordem de construção dos testes deve ser:
1. **Casos de Falha (Sad Path):**
   - Teste erros de validação (ex: DTO com dados incorretos).
   - Teste erros de autorização/autenticação (ex: falta do Bearer Token).
   - Teste erros de regras de negócio (ex: Saldo insuficiente).
   - Teste comportamentos com entidades não encontradas (ex: ID inexistente).
2. **Casos de Sucesso (Happy Path):**
   - Teste o cenário ideal, garantindo que o retorno possui a tipagem exata e o status HTTP correto (200/201).

Após escrever os testes, se você for capaz, tente executá-los para confirmar que **falham** (já que o código não existe).

### Fase 2: GREEN (Implementação Mínima)
Uma vez que os testes e as tipagens/interfaces estejam definidos:
1. Escreva a lógica no Service/Controller/Schema correspondente.
2. Escreva **apenas o suficiente** para que os testes passem. Não sofra com otimização prematura neste momento.
3. Garanta que o Vitest retorne sucesso (`PASS`) para a suíte construída.

### Fase 3: REFACTOR (Aperfeiçoamento)
Com os testes passando:
1. Inspecione o código recém-criado sob a ótica da nossa skill de `code-review` (Princípios SOLID, DRY e ETC).
2. Refatore códigos duplicados, otimize as consultas do Drizzle ORM (evitando N+1) e melhore a legibilidade.
3. Rode os testes novamente para garantir que a refatoração não quebrou o sistema.

---

## 🚦 Regras de Ouro
- **NUNCA** gere o código final sem apresentar os testes primeiro.
- **SEMPRE** importe as funções do Vitest (quando necessário, embora nosso ambiente use `globals: true`) e mantenha os testes limpos.
- Use mocks (`vi.fn()`, `vi.mock()`) de forma inteligente para isolar o banco de dados em testes puramente unitários, ou use o ambiente E2E (Supertest) para testar o fluxo de ponta a ponta (Controller -> Service -> Drizzle).
