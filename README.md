# Servos ✝

**Plataforma SaaS Nacional para Paróquias Católicas – Gestão de Voluntários**

Sistema multi-tenant hierárquico para gestão de escalas de voluntários em paróquias.

---

## Stack

- **Frontend/Backend:** Next.js 16 (App Router, Server Actions)
- **Banco de dados:** Supabase (PostgreSQL + RLS + Auth)
- **Estilização:** Tailwind CSS
- **Linguagem:** TypeScript

---

## Configuração do Ambiente

### 1. Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com)

### 2. Clonar e instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

Copie o arquivo `.env.example` para `.env.local`:

```bash
cp .env.example .env.local
```

Preencha com suas credenciais do Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
```

### 4. Criar o banco de dados no Supabase

1. Acesse o painel do Supabase → **SQL Editor**
2. Abra e execute o arquivo `database.sql` completo
3. Confirme que as tabelas foram criadas em **Table Editor**

### 5. Remover arquivo legado (importante)

O Next.js 16 substituiu `middleware.ts` por `proxy.ts`. Delete o arquivo antigo:

```bash
# No terminal dentro da pasta servos/
rm middleware.ts   # ou delete manualmente pelo explorador de arquivos
```

### 6. Executar localmente

```bash
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

---

## Estrutura do Projeto

```
servos/
├── app/
│   ├── (auth)/              # Login e Registro
│   │   ├── login/
│   │   └── register/
│   └── (app)/               # Área autenticada
│       ├── dashboard/
│       ├── ministerios/
│       ├── escalas/
│       ├── voluntarios/
│       └── configuracoes/
├── components/
│   ├── layout/              # Sidebar
│   ├── ministerios/         # Modal de ministério
│   └── escalas/             # Toggle, cards de horário
├── lib/
│   ├── supabase/            # Clientes (client/server)
│   ├── actions/             # Server Actions (CRUD)
│   └── utils.ts
├── types/
│   └── database.ts          # Types TypeScript
├── database.sql             # Schema + RLS completo
└── middleware.ts            # Autenticação + rotas
```

---

## Hierarquia dos Dados

```
PARÓQUIA
 └── MINISTÉRIOS
      └── DATAS DE SERVIÇO
           └── HORÁRIOS
                └── INSCRIÇÕES (VOLUNTÁRIOS)
```

**Regra absoluta:** Nenhum dado existe fora dessa hierarquia. Todo `parish_id` é `NOT NULL`. O RLS (Row Level Security) do Supabase garante isolamento total entre paróquias.

---

## Tipos de Usuário

| Role | Descrição |
|------|-----------|
| `SUPER_ADMIN` | Acessa todas as paróquias, visualiza métricas globais |
| `ADMIN_PARISH` | Gerencia sua paróquia (criado automaticamente ao criar paróquia) |
| `COORDINATOR` | Gerencia ministérios específicos |
| `VOLUNTEER` | Se inscreve nos horários via toggle |

### Criar o primeiro SUPER_ADMIN

Após criar seu primeiro usuário, execute no SQL Editor do Supabase:

```sql
UPDATE users SET role = 'SUPER_ADMIN' WHERE email = 'seu@email.com';
```

---

## Funcionalidades

### Dashboard
- Totais: voluntários, ministérios, próximos serviços, horários com vagas
- Lista dos 5 próximos serviços com barra de preenchimento

### Ministérios
- Listar, criar, editar e excluir ministérios da paróquia
- Exclusão em cascade (remove datas, horários e inscrições)

### Escalas
Navegação hierárquica em 3 níveis:
1. **Ministério** → 2. **Data** → 3. **Horários + Inscritos**

Em cada horário:
- Toggle para inscrever/desinscrever voluntário
- Lista de inscritos ao lado
- Indicador de vagas disponíveis
- Bloqueio automático quando lotado

### Voluntários
- Lista todos os membros da paróquia
- Busca por nome ou email
- Alteração de cargo (Admin pode promover/rebaixar)

---

## Segurança

- **RLS ativo** em todas as tabelas
- `parish_id` obrigatório em todas as tabelas dependentes
- Middleware verifica autenticação em todas as rotas protegidas
- Nenhum dado é retornado sem `WHERE parish_id = usuário.parish_id`
- SUPER_ADMIN tem visão global controlada

---

## Deploy

### Vercel (recomendado)

1. Faça o push para um repositório GitHub/GitLab
2. Importe no [Vercel](https://vercel.com)
3. Configure as variáveis de ambiente
4. Deploy automático

### Variáveis necessárias no Deploy

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

---

## Próximas funcionalidades (roadmap)

- [ ] Notificações por email (lembrete de escala)
- [ ] Relatórios e exportação PDF
- [ ] App mobile (React Native)
- [ ] Painel do SUPER_ADMIN com métricas globais
- [ ] Convite por link para paróquia específica
- [ ] Calendário visual de escalas
