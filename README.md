# Spotlight Backend

Backend API para a plataforma Spotlight Pro - Conectando profissionais criativos.

## 🚀 Tecnologias

- **NestJS** - Framework Node.js progressivo
- **TypeScript** - Linguagem de programação
- **Prisma** - ORM moderno para TypeScript
- **PostgreSQL** - Banco de dados relacional
- **JWT** - Autenticação e autorização
- **WebSocket** - Comunicação em tempo real
- **AWS S3** - Armazenamento de arquivos

## 📋 Pré-requisitos

- Node.js 18+ 
- PostgreSQL 14+
- npm ou yarn

## 🛠️ Instalação

1. Clone o repositório:
```bash
cd spotlight-backend
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

4. Edite o arquivo `.env` com suas configurações:
- `DATABASE_URL` - URL de conexão do PostgreSQL
- `JWT_SECRET` - Chave secreta para JWT
- `JWT_REFRESH_SECRET` - Chave secreta para refresh tokens
- Outras configurações conforme necessário

5. Configure o banco de dados:
```bash
# Gerar o cliente Prisma
npm run prisma:generate

# Executar migrações
npm run prisma:migrate
```

## 🏃 Executando a aplicação

### Desenvolvimento
```bash
npm run start:dev
```

A aplicação estará disponível em `http://localhost:8080/api`

### Produção
```bash
npm run build
npm run start:prod
```

## 📚 Estrutura do Projeto

```
src/
├── auth/              # Módulo de autenticação
├── users/              # Módulo de usuários
├── posts/              # Módulo de posts/feed
├── projects/           # Módulo de projetos
├── chat/               # Módulo de chat (WebSocket)
├── portfolio/          # Módulo de portfolio
├── partner-stores/     # Módulo de lojas parceiras
├── reports/            # Módulo de relatórios
├── common/             # Utilitários compartilhados
├── config/             # Configurações
└── prisma/             # Serviço Prisma
```

## 🔌 Endpoints Principais

### Autenticação
- `POST /api/auth/register` - Registrar novo usuário
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh-token` - Atualizar token
- `POST /api/auth/logout` - Logout
- `POST /api/auth/forgot-password` - Esqueci minha senha
- `POST /api/auth/reset-password` - Redefinir senha
- `PUT /api/auth/update-password` - Atualizar senha

### Usuários
- `GET /api/users/me` - Obter usuário atual
- `GET /api/users` - Listar usuários (busca)
- `GET /api/users/:id/public` - Obter perfil público
- `PUT /api/users/me` - Atualizar perfil
- `POST /api/users/follow/:id` - Seguir usuário
- `DELETE /api/users/unfollow/:id` - Deixar de seguir
- `GET /api/users/followed` - Listar seguidos
- `GET /api/users/followers` - Listar seguidores

### Posts
- `GET /api/posts` - Listar posts
- `POST /api/posts` - Criar post
- `GET /api/posts/:id` - Obter post
- `PUT /api/posts/:id` - Atualizar post
- `DELETE /api/posts/:id` - Deletar post
- `GET /api/posts/:id/comments` - Listar comentários
- `POST /api/posts/:id/comments` - Criar comentário
- `GET /api/posts/:id/reactions` - Listar reações
- `POST /api/posts/:id/reactions` - Criar reação

### Projetos
- `GET /api/projects/list` - Listar projetos
- `POST /api/projects` - Criar projeto
- `GET /api/projects/:id` - Obter projeto
- `PUT /api/projects/:id` - Atualizar projeto
- `DELETE /api/projects/:id` - Deletar projeto
- `PATCH /api/projects/:id/archive` - Arquivar projeto

## 🧪 Testes

```bash
# Testes unitários
npm run test

# Testes e2e
npm run test:e2e

# Cobertura de testes
npm run test:cov
```

## 📝 Scripts Disponíveis

- `npm run start` - Iniciar aplicação
- `npm run start:dev` - Modo desenvolvimento com watch
- `npm run start:prod` - Modo produção
- `npm run build` - Compilar TypeScript
- `npm run lint` - Executar linter
- `npm run format` - Formatar código
- `npm run prisma:generate` - Gerar cliente Prisma
- `npm run prisma:migrate` - Executar migrações
- `npm run prisma:studio` - Abrir Prisma Studio

## 🔒 Segurança

- Autenticação JWT com refresh tokens
- Validação de dados com class-validator
- Hash de senhas com bcrypt
- CORS configurado
- Guards para proteção de rotas

## 📄 Licença

Este projeto é privado e proprietário.

## 👥 Contribuindo

Este é um projeto interno. Para contribuições, entre em contato com a equipe de desenvolvimento.
