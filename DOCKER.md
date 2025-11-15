# Docker Setup Guide

Este guia explica como executar o Spotlight Backend usando Docker e Docker Compose.

## 📋 Pré-requisitos

- [Docker](https://www.docker.com/get-started) 20.10+
- [Docker Compose](https://docs.docker.com/compose/install/) 2.0+

## 🚀 Início Rápido

### Desenvolvimento

1. **Configure as variáveis de ambiente:**
   ```bash
   cp .env.example .env
   # Edite o .env conforme necessário
   ```

2. **Inicie os serviços (banco, redis, minio, maildev):**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

3. **Aguarde os serviços ficarem prontos:**
   ```bash
   docker-compose -f docker-compose.dev.yml ps
   ```

4. **Execute as migrações do Prisma:**
   ```bash
   npm install
   npm run prisma:generate
   npm run prisma:migrate
   ```

5. **Inicie a aplicação localmente:**
   ```bash
   npm run start:dev
   ```

   A API estará disponível em `http://localhost:8080/api`

### Desenvolvimento com Docker (API também no container)

1. **Inicie todos os serviços:**
   ```bash
   docker-compose up -d --build
   ```

2. **Verifique os logs:**
   ```bash
   docker-compose logs -f api
   ```

3. **Acesse os serviços:**
   - **API**: http://localhost:8080/api
   - **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin123)
   - **MailDev**: http://localhost:1080
   - **PostgreSQL**: localhost:5432
   - **Redis**: localhost:6379

## 🐳 Serviços Incluídos

### PostgreSQL
- **Porta**: 5432
- **Usuário**: postgres
- **Senha**: postgres (desenvolvimento)
- **Database**: spotlight
- **Volume**: `postgres_data` (persistência de dados)

### Redis
- **Porta**: 6379
- **Uso**: Cache e sessões
- **Volume**: `redis_data`

### MinIO (S3-compatible)
- **API Port**: 9000
- **Console Port**: 9001
- **Usuário**: minioadmin
- **Senha**: minioadmin123
- **Bucket**: spotlight-uploads (criado automaticamente)
- **Volume**: `minio_data`

### MailDev
- **Web UI**: http://localhost:1080
- **SMTP Port**: 1025
- **Uso**: Testar envio de emails em desenvolvimento

### API (NestJS)
- **Porta**: 8080
- **Health Check**: http://localhost:8080/api
- **Hot Reload**: Ativado em desenvolvimento

## 📝 Comandos Úteis

### Gerenciamento de Containers

```bash
# Iniciar todos os serviços
docker-compose up -d

# Parar todos os serviços
docker-compose down

# Parar e remover volumes (⚠️ apaga dados)
docker-compose down -v

# Ver logs
docker-compose logs -f [service-name]

# Ver status dos serviços
docker-compose ps

# Reiniciar um serviço específico
docker-compose restart [service-name]

# Executar comandos dentro do container
docker-compose exec api sh
docker-compose exec postgres psql -U postgres -d spotlight
```

### Prisma no Docker

```bash
# Gerar Prisma Client
docker-compose exec api npx prisma generate

# Executar migrações
docker-compose exec api npx prisma migrate dev

# Abrir Prisma Studio
docker-compose exec api npx prisma studio
# Acesse em http://localhost:5555 (se mapear a porta)
```

### Banco de Dados

```bash
# Conectar ao PostgreSQL
docker-compose exec postgres psql -U postgres -d spotlight

# Backup do banco
docker-compose exec postgres pg_dump -U postgres spotlight > backup.sql

# Restaurar backup
docker-compose exec -T postgres psql -U postgres spotlight < backup.sql
```

### MinIO

```bash
# Acessar console MinIO
# Abra http://localhost:9001
# Login: minioadmin / minioadmin123

# Usar MinIO Client (mc)
docker-compose exec minio-setup /usr/bin/mc ls myminio/
```

## 🏭 Produção

### Usando docker-compose.prod.yml

1. **Configure variáveis de ambiente:**
   ```bash
   # Crie um arquivo .env.prod com todas as variáveis necessárias
   # IMPORTANTE: Use valores seguros em produção!
   ```

2. **Build e deploy:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

3. **Execute migrações:**
   ```bash
   docker-compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
   ```

### Variáveis de Ambiente para Produção

Certifique-se de configurar:
- `POSTGRES_PASSWORD` - Senha forte para PostgreSQL
- `JWT_SECRET` - Chave secreta de pelo menos 256 bits
- `JWT_REFRESH_SECRET` - Chave secreta diferente para refresh tokens
- `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY` - Credenciais AWS S3
- `SMTP_*` - Configurações de email SMTP
- `CORS_ORIGIN` - URL do frontend em produção

## 🔧 Troubleshooting

### Porta já em uso

Se alguma porta estiver em uso, altere no `docker-compose.yml`:
```yaml
ports:
  - "8081:8080"  # Use porta diferente
```

### Erro de conexão com banco

```bash
# Verifique se o PostgreSQL está rodando
docker-compose ps postgres

# Verifique os logs
docker-compose logs postgres

# Reinicie o serviço
docker-compose restart postgres
```

### Limpar tudo e recomeçar

```bash
# ⚠️ ATENÇÃO: Isso apaga TODOS os dados!
docker-compose down -v
docker-compose up -d --build
```

### Rebuild da aplicação

```bash
# Rebuild sem cache
docker-compose build --no-cache api
docker-compose up -d api
```

## 📊 Monitoramento

### Health Checks

Todos os serviços têm health checks configurados. Verifique o status:

```bash
docker-compose ps
```

### Logs em Tempo Real

```bash
# Todos os serviços
docker-compose logs -f

# Apenas API
docker-compose logs -f api

# Últimas 100 linhas
docker-compose logs --tail=100 api
```

## 🔐 Segurança

### Desenvolvimento
- Senhas padrão são aceitáveis apenas em desenvolvimento
- Portas expostas para facilitar desenvolvimento

### Produção
- **NUNCA** use senhas padrão
- **NUNCA** exponha portas de banco de dados publicamente
- Use secrets management (Docker Secrets, AWS Secrets Manager, etc.)
- Configure firewall adequadamente
- Use HTTPS/TLS para todas as conexões

## 📚 Recursos Adicionais

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [MinIO Documentation](https://min.io/docs/)
- [Redis Docker Image](https://hub.docker.com/_/redis)

