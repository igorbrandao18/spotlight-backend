# 🚀 k6 Load Testing

Este diretório contém scripts de teste de carga usando [k6](https://k6.io/) para validar a performance e escalabilidade da API Spotlight.

## 📋 Pré-requisitos

Instale o k6:
```bash
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
choco install k6
```

## 📁 Scripts Disponíveis

### 1. `auth-load-test.js` - Teste de Autenticação
Testa apenas os endpoints de autenticação (register, login, refresh).

**Uso:**
```bash
# Local
pnpm test:load:auth

# Produção
pnpm test:load:auth:prod
```

**Configuração:**
- Duração: ~7 minutos
- Usuários máximos: 100
- Foco: Performance de autenticação

### 2. `auth-load-test-realistic.js` - Teste Realista de Auth
Teste de autenticação respeitando rate limits.

**Uso:**
```bash
# Local
pnpm test:load:realistic

# Produção
pnpm test:load:realistic:prod
```

**Configuração:**
- Duração: ~7.5 minutos
- Usuários máximos: 10
- Respeita rate limits: Register (3/hora), Login (5/15min)

### 3. `full-api-load-test.js` - Teste Completo da API ⭐
Testa **TODOS** os módulos e endpoints da API simulando uso real.

**Uso:**
```bash
# Local
pnpm test:load:full

# Produção
pnpm test:load:full:prod
```

**Configuração:**
- Duração: ~21 minutos
- Usuários máximos: 100
- Módulos testados:
  - ✅ Auth (register, login, refresh)
  - ✅ Users (getMe, search, follow/unfollow)
  - ✅ Posts (list, create, get, reactions, comments)
  - ✅ Projects (list, create, get, members, milestones)
  - ✅ Portfolio (list, create, get, like, view, comments)
  - ✅ Chat (rooms, messages)
  - ✅ Reports (create)
  - ✅ Partner Stores (list, get, equipments)

**Comportamento:**
- Simula diferentes tipos de usuários
- Probabilidades realistas de ações (ex: 80% lê posts, 15% cria posts)
- Mantém estado entre requisições (tokens, IDs criados)
- Delays realistas entre ações (3-8 segundos)

## 🎯 Thresholds de Performance

Todos os testes validam:

- **http_req_duration p(95):** < 1000ms
- **http_req_duration p(99):** < 2000ms
- **http_req_failed:** < 5%
- **Módulo específico:** Thresholds individuais por módulo

## 📊 Interpretando Resultados

### ✅ Sucesso
```
✓ 'p(95)<1000' p(95)=450ms
✓ 'rate<0.05' rate=0.02%
```

### ⚠️ Atenção
```
✗ 'p(95)<1000' p(95)=1200ms
```
Indica que 5% das requisições estão acima do threshold. Investigar gargalos.

### ❌ Crítico
```
✗ 'rate<0.05' rate=15.00%
```
Taxa de erro alta. Verificar logs e saúde da aplicação.

## 🔧 Variáveis de Ambiente

```bash
# URL da API
API_URL=https://spotlight.brandaodeveloper.com.br/api

# Exemplo de uso
API_URL=https://spotlight.brandaodeveloper.com.br/api k6 run k6/load-tests/full-api-load-test.js
```

## 📈 Métricas Customizadas

Cada teste rastreia métricas específicas:

- **auth_duration**: Tempo de operações de autenticação
- **users_duration**: Tempo de operações de usuários
- **posts_duration**: Tempo de operações de posts
- **projects_duration**: Tempo de operações de projetos
- **portfolio_duration**: Tempo de operações de portfolio
- **chat_duration**: Tempo de operações de chat
- **reports_duration**: Tempo de operações de reports
- **partner_stores_duration**: Tempo de operações de partner stores

## 🎭 Simulação de Usuários

O teste completo (`full-api-load-test.js`) simula diferentes padrões de uso:

1. **Usuário Novo (10%)**: Registra e explora a plataforma
2. **Usuário Ativo (90%)**: Login e uso completo da plataforma
   - 80% lê posts
   - 15% cria posts
   - 25% interage (reactions, comments)
   - 40% visualiza projetos
   - 30% visualiza portfolio
   - 25% acessa chat
   - 20% busca usuários
   - 5% cria reports

## 🚨 Rate Limiting

Os testes respeitam os rate limits configurados:

- **Register**: 3 tentativas/hora
- **Login**: 5 tentativas/15 minutos
- **Refresh Token**: 10 tentativas/minuto
- **API Geral**: 100 requisições/minuto

## 📝 Exemplo de Execução

```bash
# Teste completo em produção
cd spotlight-backend
pnpm test:load:full:prod

# Saída esperada:
# 🚀 Starting comprehensive API load test...
# 📍 API URL: https://spotlight.brandaodeveloper.com.br/api
# ⏱️  Test duration: ~21 minutes
# 👥 Max concurrent users: 100
# 📊 Testing all modules: Auth, Users, Posts, Projects, Portfolio, Chat, Reports, Partner Stores
```

## 🔍 Troubleshooting

### Erro: "Connection refused"
- Verifique se a API está rodando
- Confirme a URL no `API_URL`

### Erro: "429 Too Many Requests"
- Rate limiting está funcionando
- Use `auth-load-test-realistic.js` para testes respeitando limites

### Performance ruim
- Verifique logs do Docker: `docker compose logs api`
- Analise métricas do banco de dados
- Revise índices criados no Prisma schema

## 📚 Recursos

- [Documentação k6](https://k6.io/docs/)
- [k6 Metrics](https://k6.io/docs/using-k6/metrics/)
- [k6 Thresholds](https://k6.io/docs/using-k6/thresholds/)
