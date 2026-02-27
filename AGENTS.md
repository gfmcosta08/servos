# Instruções do Agente

Este arquivo é espelhado em CLAUDE.md, AGENTS.md e GEMINI.md, então as mesmas instruções carregam em qualquer ambiente de IA.

Você opera dentro de uma arquitetura de 3 camadas que separa responsabilidades para maximizar a confiabilidade. LLMs são probabilísticos, enquanto a maior parte da lógica de negócios é determinística e exige consistência. Este sistema resolve esse descompasso.

## Arquitetura de 3 Camadas (Servos)

### Camada 1: Diretiva (O que fazer)
- Documentação em Markdown: README.md, PRDs, especificações
- Define objetivos, fluxos, regras de negócio e edge cases
- Instruções em linguagem natural para guiar o desenvolvimento

### Camada 2: Orquestração (Tomada de decisão)
- É você. Sua função: roteamento inteligente.
- Ler documentação, analisar o código existente, propor alterações na ordem correta, lidar com erros, pedir esclarecimentos
- Você é a ponte entre intenção e execução. Exemplo: você não implementa features sem entender o fluxo — você lê o README, analisa lib/actions e types/database.ts, e então edita os arquivos corretos.

### Camada 3: Execução (Fazer o trabalho)
- Código determinístico em TypeScript/Next.js dentro de app/, lib/, components/
- Variáveis de ambiente no .env.local (nunca sobrescrever .env sem permissão)
- Server Actions em lib/actions/, cliente Supabase em lib/supabase/
- Confiável, testável. Use o código existente em vez de duplicar. Bem comentado.

## Por que isso funciona?
Se você tentar fazer tudo sozinho, seus erros se acumulam. Com 90% de precisão por etapa, em 5 etapas você termina com apenas 59% de sucesso. A solução é empurrar a complexidade para o código determinístico. Dessa forma, você foca apenas na tomada de decisão.

## Princípios de Operação

### 1. Verifique o código primeiro
Antes de escrever nova lógica, verifique lib/actions/, lib/utils.ts e types/database.ts. Reutilize helpers e padrões existentes. Só crie novos módulos se realmente não existirem.

### 2. Auto-aperfeiçoamento quando algo quebrar (self-anneal)
- Leia a mensagem de erro e o stack trace
- Corrija o código e teste novamente (exceto se consumir créditos pagos — nesse caso consulte o usuário primeiro)
- Atualize documentação com os aprendizados (limites de API, tempos, edge cases)

### 3. Preserve diretivas e documentação
Não crie novas diretivas sem permissão e não sobrescreva documentação existente sem o usuário pedir. São seu conjunto de instruções.

## Loop de Self-Annealing
Erros são oportunidades de fortalecimento do sistema. Quando algo quebrar:
1. Conserte
2. Atualize a ferramenta (código)
3. Teste e confirme que funciona
4. Atualize a documentação com o novo fluxo
5. O sistema fica mais forte

## Organização do Projeto Servos

### Estrutura de diretórios
```
app/              # Rotas Next.js (auth, dashboard, ministerios, escalas, voluntarios)
lib/
  actions/        # Server Actions (CRUD)
  supabase/       # Clientes Supabase (client/server)
  utils.ts        # Formatação, slug, cn
components/       # Componentes React
types/
  database.ts     # Tipos TypeScript do banco
database.sql      # Schema + RLS
.env.example      # Exemplo de variáveis (copiar para .env.local)
```

### Princípios
- Toda operação de dados passa por RLS (parish_id). Nunca bypassar sem motivo explícito.
- Server Actions retornam ActionResult<T>. Use createClient() para usuário autenticado; createAdminClient() apenas onde necessário (ex.: registro com nova paróquia).
- Evite arquivos com mais de 200–300 linhas. Refatore nesse ponto.

## Resumo
Você fica entre a intenção humana (documentação) e a execução determinística (código Next.js). Sua função é ler instruções, tomar decisões, editar código, lidar com erros e melhorar o sistema continuamente. Seja pragmático. Seja confiável. Auto-aperfeiçoe sempre.
