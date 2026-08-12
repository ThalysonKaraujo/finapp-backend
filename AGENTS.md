# 🏗️ FinApp Backend - Diretrizes de Arquitetura

Bem-vindo ao projeto `fin-app-backend`. Como um Agente, sua tarefa é garantir que a base de código nunca se deteriore e sempre siga a arquitetura **Vertical Slicing (Domain-Driven)** descrita abaixo.

## 🧱 Estrutura de Pastas Obrigatória (Vertical Slicing)

O padrão de arquitetura do projeto determina que o código deve ser organizado verticalmente por **Domínio de Negócio (Features)** e nunca horizontalmente por camadas técnicas.

### Árvore de Referência:
```text
src/
├── main.ts
├── app.module.ts
├── common/                  # Compartilhados (NÃO colocar regras de negócio aqui)
│   ├── decorators/
│   ├── guards/
│   ├── filters/
│   └── utils/
├── database/                # Configurações do Drizzle e DB
├── auth/                    # Core do Better Auth
└── modules/                 # OBRIGATÓRIO PARA NOVAS FEATURES
    ├── [nome-da-feature]/   # Ex: wallets, transactions, categories
    │   ├── [feature].module.ts
    │   ├── [feature].controller.ts
    │   ├── [feature].service.ts
    │   ├── [feature].schema.ts      <-- Schema Drizzle no próprio módulo
    │   ├── dto/
    │   └── tests/
    │       ├── [feature].service.spec.ts
    │       └── [feature].e2e-spec.ts
```

## 📜 Regras Imutáveis

1. **Isolamento de Domínio:** Toda nova entidade ou funcionalidade deve ser criada DENTRO da pasta `src/modules/`.
2. **Proibição de Pastas Horizontais:** **NUNCA** crie pastas como `src/controllers/`, `src/services/` ou `src/schemas/`. O agrupamento é por feature.
3. **Schemas Locais:** O Drizzle deve procurar os schemas usando glob patterns (ex: `src/**/*.schema.ts`), portanto, os schemas das tabelas devem conviver ao lado dos seus respectivos services e controllers.
4. **Respeito ao TDD:** Todos os módulos de negócio gerados devem ser acompanhados da pasta `tests/` dentro do próprio módulo, aplicando os ciclos RED, GREEN e REFACTOR, testando falhas e sucessos.
5. **Independência Mútua:** Módulos não devem ter acoplamento forte. Modificar a estrutura da pasta `modules/wallets` não deve quebrar a pasta `modules/users`.
6. **Commits (Conventional & English):** Ao realizar commits, utilize obrigatoriamente as convenções do Conventional Commits em **inglês** e mantenha as mensagens **curtas** e diretas (ex: `feat: add swagger to controllers`).
7. **Proibição de Push:** NUNCA execute `git push`. A responsabilidade de realizar o push para o repositório remoto é exclusiva do usuário. Apenas realize commits quando solicitado.

Ao construir qualquer nova rota, controller ou funcionalidade para o usuário, consulte e obedeça estas diretrizes acima antes de escrever a primeira linha de código.
