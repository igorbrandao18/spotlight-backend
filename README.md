# Spotlight Backend

Backend API para a plataforma Spotlight Pro - Conectando profissionais criativos.

## 🚀 Tecnologias

- **NestJS 11+** - Framework Node.js progressivo
- **TypeScript 5.7+** - Linguagem de programação
- **Prisma 5.7+** - ORM moderno para TypeScript
- **PostgreSQL 14+** - Banco de dados relacional
- **JWT** - Autenticação e autorização
- **WebSocket (Socket.io)** - Comunicação em tempo real
- **AWS S3** - Armazenamento de arquivos (TODO)
- **class-validator** - Validação de DTOs
- **bcrypt** - Hash de senhas

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

### ✅ Autenticação (`/api/auth`)
- `POST /api/auth/register` - Registrar novo usuário (Public)
- `POST /api/auth/login` - Login (Public)
- `POST /api/auth/refresh-token` - Atualizar token (Public)
- `POST /api/auth/logout` - Logout (Protected)
- `POST /api/auth/forgot-password` - Esqueci minha senha (Public)
- `POST /api/auth/reset-password` - Redefinir senha (Public)
- `PUT /api/auth/update-password` - Atualizar senha (Protected)

### ✅ Usuários (`/api/users`)
- `GET /api/users/me` - Obter usuário atual
- `GET /api/users` - Listar usuários (busca: `?search=term`)
- `GET /api/users/:id/public` - Obter perfil público
- `PUT /api/users/me` - Atualizar perfil
- `POST /api/users/follow/:id` - Seguir usuário
- `DELETE /api/users/unfollow/:id` - Deixar de seguir
- `GET /api/users/followed` - Listar seguidos (`?userId=id`)
- `GET /api/users/followers` - Listar seguidores (`?userId=id`)
- `PUT /api/users/me/images` - Upload avatar/cover (multipart)
- `POST /api/users/me/resume` - Upload resume (multipart)
- `GET /api/users/preferences` - Obter preferências
- `PUT /api/users/preferences` - Atualizar preferências

### ✅ Posts (`/api/posts`)
- `GET /api/posts` - Listar posts
- `POST /api/posts` - Criar post (multipart para imagem)
- `GET /api/posts/:id` - Obter post
- `PUT /api/posts/:id` - Atualizar post
- `DELETE /api/posts/:id` - Deletar post
- `GET /api/posts/:id/comments` - Listar comentários
- `POST /api/posts/:id/comments` - Criar comentário (suporta parentId para respostas)
- `DELETE /api/posts/comments/:id` - Deletar comentário
- `GET /api/posts/:id/reactions` - Listar reações
- `POST /api/posts/:id/reactions` - Criar reação (LIKE, LOVE, HAHA, WOW, SAD, ANGRY)
- `DELETE /api/posts/:id/reactions` - Remover reação

### ✅ Projetos (`/api/projects`)
- `GET /api/projects/list` - Listar projetos (`?projectId=id&archived=true`)
- `POST /api/projects` - Criar projeto (multipart para imagem)
- `GET /api/projects/:id` - Obter projeto (`?archived=true`)
- `PUT /api/projects/:id` - Atualizar projeto
- `DELETE /api/projects/:id` - Deletar projeto
- `PATCH /api/projects/:id/archive` - Arquivar projeto
- `GET /api/projects/list/colaboration` - Projetos de colaboração (`?userId=id`)
- `GET /api/projects/:id/members` - Listar membros
- `POST /api/projects/:id/members` - Adicionar membro
- `DELETE /api/projects/:id/members/:memberId` - Remover membro
- `GET /api/projects/:id/milestones` - Listar milestones
- `POST /api/projects/:id/milestones` - Criar milestone
- `PUT /api/projects/:id/milestones/:milestoneId` - Atualizar milestone
- `DELETE /api/projects/:id/milestones/:milestoneId` - Deletar milestone
- `PUT /api/projects/:id/image` - Upload imagem do projeto

### ✅ Chat (`/api/chat` + WebSocket)
**HTTP Endpoints:**
- `GET /api/chat` - Listar salas de chat
- `GET /api/chat/:roomId` - Obter informações da sala
- `GET /api/chat/:roomId/messages` - Obter mensagens (`?page=0&size=20`)
- `POST /api/chat/:userId` - Criar/obter sala 1-on-1

**WebSocket (`/api/ws`):**
- `join` - Entrar em uma sala
- `leave` - Sair de uma sala
- `message` - Enviar mensagem
- `typing` - Indicador de digitação
- Eventos: `message`, `user_joined`, `user_left`, `typing`, `user_online`, `user_offline`

### ✅ Portfolio (`/api/portfolio`)
- `GET /api/portfolio` - Listar itens (`?userId=id`)
- `POST /api/portfolio` - Criar item (multipart para arquivos)
- `GET /api/portfolio/:id` - Obter item
- `PUT /api/portfolio/:id` - Atualizar item
- `DELETE /api/portfolio/:id` - Deletar item
- `POST /api/portfolio/:id/like` - Curtir item
- `POST /api/portfolio/:id/unlike` - Descurtir item
- `GET /api/portfolio/:id/likes` - Listar curtidas
- `POST /api/portfolio/:id/view` - Registrar visualização
- `GET /api/comments/:itemId` - Listar comentários (`?page=0&size=10`)
- `POST /api/comments/:itemId` - Criar comentário
- `PUT /api/comments/:itemId/:commentId` - Atualizar comentário
- `DELETE /api/comments/:itemId/:commentId` - Deletar comentário

### ✅ Partner Stores (`/api/partner-stores`)
- `GET /api/partner-stores` - Listar lojas
- `GET /api/partner-stores/:id` - Obter loja
- `POST /api/partner-stores` - Criar loja (Admin)
- `PUT /api/partner-stores/:id` - Atualizar loja (Admin)
- `DELETE /api/partner-stores/:id` - Deletar loja (Admin)
- `POST /api/partner-stores/:id/images` - Upload logo/cover (Admin)
- `GET /api/partner-stores/equipments` - Listar equipamentos (`?partnerStoreId=id`)
- `GET /api/partner-stores/equipments/:id` - Obter equipamento
- `POST /api/partner-stores/equipments` - Criar equipamento (Admin, multipart)
- `PUT /api/partner-stores/equipments/:id` - Atualizar equipamento (Admin)
- `DELETE /api/partner-stores/equipments/:id` - Deletar equipamento (Admin)
- `POST /api/partner-stores/equipments/:id/images` - Upload imagens (Admin)
- `DELETE /api/partner-stores/equipments/:id/images` - Deletar imagem (`?key=imageKey`)

### ✅ Reports (`/api/reports`)
- `GET /api/reports` - Listar relatórios (Admin)
- `GET /api/reports/:id` - Obter relatório (Admin)
- `POST /api/reports/new` - Criar relatório
- `PUT /api/reports/:id` - Atualizar status do relatório (Admin)

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

- ✅ Autenticação JWT com refresh tokens
- ✅ Validação de dados com class-validator
- ✅ Hash de senhas com bcrypt (10 rounds)
- ✅ CORS configurado
- ✅ Guards para proteção de rotas
- ✅ Validação de propriedade de recursos (owner checks)
- ✅ Role-based access control (RBAC) para admin endpoints
- ✅ WebSocket authentication com JWT

## 📊 Status dos Módulos

| Módulo | Status | Funcionalidades |
|--------|--------|----------------|
| Auth | ✅ Completo | Login, Register, Refresh Token, Password Reset |
| Users | ✅ Completo | CRUD, Follow/Unfollow, Profile, Uploads |
| Posts | ✅ Completo | CRUD, Comments, Reactions, Image Upload |
| Projects | ✅ Completo | CRUD, Members, Milestones, Archive |
| Chat | ✅ Completo | WebSocket, Rooms, Messages, Typing |
| Portfolio | ✅ Completo | Items, Media, Likes, Views, Comments |
| Partner Stores | ✅ Completo | Stores, Equipment, Images |
| Reports | ✅ Completo | Content Moderation |

## 🚧 Próximas Implementações

- [ ] Upload de arquivos para S3/Cloudinary
- [ ] Serviço de email (Nodemailer)
- [ ] Rate limiting
- [ ] Cache com Redis
- [ ] Notifications module
- [ ] Dashboard/Analytics module
- [ ] Testes unitários e E2E
- [ ] Documentação Swagger/OpenAPI

## 📄 Licença

Este projeto é privado e proprietário.

## 👥 Contribuindo

Este é um projeto interno. Para contribuições, entre em contato com a equipe de desenvolvimento.
