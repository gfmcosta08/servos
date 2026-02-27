# Permissões e Roles (Servos)

## Modelo de permissões

| Role / Função | Permissões |
|---------------|------------|
| **SUPER_ADMIN** | Tudo: gerencia paróquias, usuários, ministérios, escalas e horários em qualquer paróquia |
| **ADMIN_PARISH** | Gerencia usuários (delegar coordenadores por ministério), ministérios e paróquia. **Não** cria/edita escalas nem horários |
| **Coordenador de ministério** | Cria e edita escalas (datas), horários e vagas **apenas no ministério** do qual é coordenador |
| **VOLUNTEER** | Apenas se inscreve em vagas disponíveis |

## Fluxo

1. **Criação de paróquia:** Quem cria uma nova paróquia vira **ADMIN_PARISH** automaticamente.
2. **Registro em paróquia existente:** O usuário escolhe paróquia e ministério ao qual se candidata. Vira **VOLUNTEER**.
3. **Delegação de coordenador:** O SUPER_ADMIN ou ADMIN_PARISH vai em Voluntários e adiciona o usuário como coordenador do ministério desejado (ex.: Liturgia, Dízimo).
4. **Escalas:** Apenas coordenadores do ministério (ou SUPER_ADMIN) podem criar datas, horários e definir vagas por função.

## Tabela `ministry_coordinators`

Relaciona usuário e ministério: um usuário pode ser coordenador de vários ministérios.

- `user_id` + `ministry_id` (UNIQUE)
- Inserir/remover: apenas ADMIN_PARISH ou SUPER_ADMIN

## Coluna `users.ministry_preference_id`

Ao se registrar em paróquia existente, o usuário pode indicar o ministério ao qual deseja se candidatar. Isso facilita a delegação: o administrador vê "Candidatou-se a: Liturgia" e pode adicioná-lo como coordenador desse ministério.
