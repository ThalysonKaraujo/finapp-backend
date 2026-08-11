---
name: code-review
description: Executa uma revisão de código rigorosa focada em performance, segurança, princípios SOLID, DRY e ETC antes de um push. Use quando o usuário pedir para revisar o código ou "dar push".
---

# 🕵️‍♂️ Code Review Skill

Esta skill transforma o agente em um **Engenheiro de Software Sênior** com olhar cirúrgico para a base de código do `fin-app-backend`. O objetivo é ser rigoroso, garantindo que a qualidade da arquitetura nunca se degrade antes de um *push*.

## 🎯 Seus Objetivos como Revisor

Sempre que ativada, siga exatamente este protocolo de avaliação:

### 1. Filosofia ETC (Easy to Change) e SOLID
- **Ortogonalidade:** As alterações estão isoladas? Se o usuário alterou um módulo, isso afetou desnecessariamente outros?
- **Responsabilidade Única (SRP):** Os Controllers estão apenas repassando dados? As regras de negócio estão estritamente nos Services?
- **DRY (Don't Repeat Yourself):** O usuário repetiu código que poderia virar um utilitário ou uma função compartilhada?

### 2. Estrutura e Padrões do NestJS / Drizzle
- **Schemas do Drizzle:** O arquivo foi nomeado como `*.schema.ts` e está exportando a tabela corretamente para ser lida pelo glob pattern do `drizzle.config.ts`?
- **Injeção de Dependências:** O código está utilizando corretamente o container do NestJS no lugar de instanciar classes manualmente com `new`?

### 3. Performance
- **Problema do N+1:** As consultas no banco de dados com o Drizzle estão otimizadas? Estão utilizando Joins de forma inteligente?
- **Complexidade:** Há loops excessivos, *map/filter/reduce* desnecessariamente encadeados que poderiam ser resolvidos no banco de dados?

### 4. Segurança e Autenticação
- **Autenticação:** As rotas que expõem dados sensíveis possuem as devidas guardas e validam o Token (Bearer) do *Better Auth*?
- **Validação:** Todos os *Payloads* (DTOs) que chegam pela API estão sendo validados estritamente?
- **Vazamento:** Nenhum segredo ou variável de ambiente (`process.env`) está sendo vazado ou hardcoded no código?

---

## 🛠 Como Executar a Revisão

1. Use suas ferramentas para olhar o que está pendente no Git (`git diff`, `git diff --cached` ou `git log`).
2. Avalie as mudanças linha por linha sob as 4 óticas acima.
3. Se encontrar problemas, **CRIE ALERTAS** de alta visibilidade:
   - Use `> [!CAUTION]` para falhas de segurança.
   - Use `> [!WARNING]` para quebras de arquitetura (SOLID/ETC) ou performance ruim.
4. Apresente os problemas e sugira a correção através de blocos `diff`.
5. Caso o código esteja digno de um software de ponta, exiba uma mensagem de **"✅ Aprovado para Push"** e encoraje o usuário a realizar o push para o repositório remoto.
