# Implantação no Catalyst DEV — Azure SQL + Entra ID

## Variáveis de ambiente

### Frontend (Catalyst / App Service)

| Variável | Valor | Descrição |
|---|---|---|
| `VITE_APP_MODE` | `catalyst` | Ativa modo Catalyst (REST API + Easy Auth). Sem ela, roda em modo Bolt (Supabase). |
| `VITE_API_BASE_URL` | (URL do backend) | URL base do backend Express. Se o backend está no mesmo domínio, deixar vazio. |

### Backend (Express / App Service)

| Variável | Exemplo | Descrição |
|---|---|---|
| `PORT` | `3001` | Porta do servidor Express |
| `NODE_ENV` | `production` | Modo produção (nunca `development` em deploy) |
| `AZURE_SQL_SERVER` | `srv-ciclica.database.windows.net` | Host do Azure SQL Server |
| `AZURE_SQL_DATABASE` | `db-ciclica` | Nome do banco |
| `AZURE_SQL_USER` | `app-ciclica` | Usuário do banco (sem senha no chat) |
| `AZURE_SQL_PASSWORD` | (configurar no App Service) | Senha do banco — configurar via Azure Portal, nunca no código |
| `ENTRA_TENANT_ID` | (UUID do tenant) | Tenant ID do Microsoft Entra ID |
| `ENTRA_AUDIENCE` | (clientId da App Registration) | Audience esperada no token (clientId do backend no Entra) |
| `EASY_AUTH_ENABLED` | `true` | Ativa confiança nos cabeçalhos do Easy Auth do App Service |
| `WEBSITE_AUTH_ENABLED` | `true` | Alternativa detectada automaticamente pelo App Service |
| `AUTH_BYPASS` | (não definir em produção) | Apenas para desenvolvimento local |

## Passos para migração e publicação

### 1. Provisionar recursos no Azure

1. Criar Azure SQL Server e database
2. Criar App Registration no Entra ID para o backend (obter clientId = audience)
3. Anotar o Tenant ID do diretório Entra

### 2. Configurar Easy Auth no App Service

1. No App Service → Authentication → Add identity provider
2. Selecionar Microsoft (Entra ID)
3. Usar a App Registration criada
4. Definir action: "Log in with Microsoft Entra ID"
5. O App Service passa a injetar `x-ms-client-principal-name` e correlatos

### 3. Aplicar esquema T-SQL

```sql
-- Executar server/schema/001_init.sql no Azure SQL Server
-- Reexecutável: todas as instruções usam IF NOT EXISTS
```

### 4. Deploy do backend

1. Configurar variáveis de ambiente no App Service (Connection strings + Entra)
2. Nunca definir `NODE_ENV=development` nem `AUTH_BYPASS` em produção
3. Deploy via Git ou ZIP

### 5. Deploy do frontend

1. Build com `VITE_APP_MODE=catalyst` e `VITE_API_BASE_URL` apontando para o backend
2. Deploy dos estáticos no App Service ou CDN

### 6. Migração de dados (Bolt → Azure SQL)

1. Acessar a aba "Migração" (disponível apenas em modo Catalyst)
2. Clicar "Exportar dados" — lê todas as 7 tabelas do Supabase (Bolt)
3. Clicar "Migrar para Azure SQL" — envia o payload para `/api/migrate`
4. Validar contagens: o endpoint retorna esperado x atual por tabela
5. A migração é reexecutável: rodar de novo atualiza registros existentes (MERGE)
6. UUIDs são preservados — os IDs do Bolt viram os IDs no Azure SQL

### 7. Validação

- `GET /api/migrate/validate` retorna contagens atuais por tabela
- Comparar com os totais do Bolt antes de desligar o Supabase

## Modo Bolt (preview) — sem mudanças

Sem `VITE_APP_MODE=catalyst`, o frontend usa Supabase diretamente.
Todas as funcionalidades existentes permanecem idênticas.
A aba "Migração" fica oculta fora do modo Catalyst.

## Segurança

- **Easy Auth**: cabeçalhos `x-ms-client-principal-*` são confiáveis apenas quando `EASY_AUTH_ENABLED=true`. Fora do App Service, esses cabeçalhos são ignorados.
- **Bearer token**: quando Easy Auth está inativo (dev/test), o backend valida JWT Entra via JWKS.
- **Negar por padrão**: qualquer requisição sem autenticação recebe 401.
- **Sem SQL no navegador**: todas as queries SQL ficam no backend. O frontend chama apenas REST.
- **Sem modo desenvolvimento em deploy**: `NODE_ENV=production` bloqueia o bypass de auth.
