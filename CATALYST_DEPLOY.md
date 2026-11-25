# Implantação no Catalyst DEV — Azure SQL + Entra ID

## Visão geral

O projeto tem dois builds completamente separados:

- **Bolt (preview)**: frontend fala com Supabase diretamente. Build padrão (`npm run build`).
- **Catalyst**: frontend fala apenas com a REST API; sem Supabase no bundle. Build com `VITE_APP_MODE=catalyst`.

O bundle Catalyst **não inclui** o cliente Supabase, a chave anon, nem `@supabase/supabase-js`.

## .gitignore

Artefatos gerados (`dist/`, `dist-catalyst/`, `node_modules/`) e `.env` estão no `.gitignore` e não devem ser commitados. Se existem artefatos `dist/` já rastreados no repositório, remova-os com `git rm -r --cached dist/` antes de commitar.

## Variáveis de ambiente

### Frontend (Catalyst)

| Variável | Valor | Descrição |
|---|---|---|
| `VITE_APP_MODE` | `catalyst` | Ativa modo Catalyst. Sem ela, roda em modo Bolt. |
| `VITE_API_BASE_URL` | (URL do backend) | URL base do backend Express. Vazio se mesmo domínio. |

### Backend (Express)

| Variável | Exemplo | Descrição |
|---|---|---|
| `PORT` | `3001` | Porta do servidor |
| `NODE_ENV` | `production` | Nunca `development` em deploy |
| `AZURE_SQL_SERVER` | `srv-ciclica.database.windows.net` | Host do Azure SQL |
| `AZURE_SQL_DATABASE` | `db-ciclica` | Nome do banco |
| `AZURE_SQL_USER` | `app-ciclica` | Usuário (sem senha no código) |
| `AZURE_SQL_PASSWORD` | (App Service config) | Senha — configurar no Azure Portal |
| `ENTRA_TENANT_ID` | (UUID) | Tenant ID do Entra |
| `ENTRA_AUDIENCE` | (clientId) | Audience esperada no token |
| `EASY_AUTH_ENABLED` | `true` | Ativa confiança nos cabeçalhos Easy Auth |
| `MIGRATION_ADMINS` | `admin@nexteer.com` | E-mails autorizados a migrar via API |

## Build e deploy

### Docker (recomendado)

```bash
docker build -t contagem-ciclica-catalyst .
docker run -p 3001:3001 \
  -e AZURE_SQL_SERVER=... \
  -e AZURE_SQL_DATABASE=... \
  -e AZURE_SQL_USER=... \
  -e AZURE_SQL_PASSWORD=... \
  -e ENTRA_TENANT_ID=... \
  -e ENTRA_AUDIENCE=... \
  -e EASY_AUTH_ENABLED=true \
  -e MIGRATION_ADMINS=admin@nexteer.com \
  contagem-ciclica-catalyst
```

O Dockerfile faz o build do frontend com `VITE_APP_MODE=catalyst` e serve os estáticos junto com o backend na porta 3001.

### Manual

1. **Frontend**: `VITE_APP_MODE=catalyst npm run build` — gera `dist/` sem Supabase
2. **Backend**: `cd server && npm ci --omit=dev && node src/index.js`
3. Servir os estáticos do frontend pelo App Service ou pelo Express

## Migração de dados (Bolt → Azure SQL)

A migração **não é mais feita pelo navegador**. Use a ferramenta administrativa local:

### Pré-requisitos

1. Azure SQL provisionado e esquema `server/schema/001_init.sql` aplicado
2. Variáveis de ambiente configuradas no arquivo `.env` local (não commitado):

```
VITE_SUPABASE_URL=https://...supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
AZURE_SQL_SERVER=srv-ciclica.database.windows.net
AZURE_SQL_DATABASE=db-ciclica
AZURE_SQL_USER=app-ciclica
AZURE_SQL_PASSWORD=...
```

### Execução

```bash
cd server
node migrate-cli.mjs
```

A ferramenta:
1. Lê todas as 7 tabelas do Supabase (Bolt)
2. Insere no Azure SQL preservando UUIDs (insert-only)
3. Pula registros já existentes — re-executável, nunca sobrescreve
4. Mostra contagens finais por tabela para validação

### Validação via API

Após a migração, valide contagens pelo endpoint admin:

```bash
curl -H "Authorization: Bearer <token>" https://<backend>/api/migrate/validate
```

Retorna contagens atuais por tabela. Compare com os totais do Bolt antes de desligar o Supabase.

## Segurança

- **Easy Auth**: cabeçalhos `x-ms-client-principal-*` confiáveis apenas quando `EASY_AUTH_ENABLED=true`
- **Bearer token**: validação JWT via JWKS quando Easy Auth inativo
- **Negar por padrão**: sem autenticação → 401
- **Migração admin-only**: `/api/migrate` exige `MIGRATION_ADMINS`; usuários comuns → 403
- **Insert-only**: migração nunca sobrescreve dados existentes
- **SQL injection**: todos os valores usam parâmetros `@p`; nomes de tabela validados por allowlist
- **Sem SQL no navegador**: frontend chama apenas REST
- **Sem modo development em deploy**: `NODE_ENV=production` bloqueia bypass
- **Erros não vazam**: handler retorna mensagem genérica
- **Bundle Catalyst limpo**: zero código Supabase, zero chave anon
- **Segredos fora do repositório**: `.env` no `.gitignore`, `dist/` no `.gitignore`

## Modo Bolt (preview) — sem mudanças

Sem `VITE_APP_MODE=catalyst`, o frontend usa Supabase diretamente. Todas as funcionalidades existentes permanecem idênticas.
