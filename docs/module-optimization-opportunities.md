# 🎯 Module Optimization Opportunities

## ✅ Já Implementado

### Auth Module
- ✅ Índices no banco (email, name, enabled, createdAt)
- ✅ Queries otimizadas (select apenas campos necessários)
- ✅ Rate limiting implementado
- ✅ Performance: 96% de melhoria (2.14s → 101ms)

## 🔧 Oportunidades de Otimização

### 1. Users Module ⚠️ ALTA PRIORIDADE

#### `searchUsers()` - Sem paginação real
**Problema:**
- Retorna apenas 20 resultados fixos (`take: 20`)
- Não aceita parâmetros de paginação
- Não usa índices criados de forma eficiente

**Solução:**
```typescript
async searchUsers(
  search: string,
  page: number = 1,
  limit: number = 20,
  currentUserId?: string
) {
  const skip = (page - 1) * limit;
  
  const [users, total] = await Promise.all([
    this.prisma.user.findMany({
      where: { /* ... */ },
      skip,
      take: limit,
      // Usar índices criados
    }),
    this.prisma.user.count({ where: { /* ... */ } })
  ]);
  
  return {
    content: users,
    page: {
      size: limit,
      number: page,
      totalElements: total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
```

**Impacto esperado:** 30-50% melhoria em queries com muitos resultados

#### `getMe()` - Carrega muitas relações
**Problema:**
- Carrega todas as relações mesmo quando não necessárias
- Não usa projeção seletiva

**Solução:**
- Adicionar parâmetro opcional para incluir apenas relações necessárias
- Usar `select` ao invés de `include` quando possível

**Impacto esperado:** 20-40% redução no tempo de resposta

### 2. Posts Module ⚠️ ALTA PRIORIDADE

#### `findAll()` - Sem paginação
**Problema:**
- Retorna apenas 50 posts fixos (`take: 50`)
- Não aceita parâmetros de paginação
- Não usa índices criados de forma eficiente

**Solução:**
```typescript
async findAll(
  userId?: string,
  page: number = 1,
  limit: number = 20
) {
  const skip = (page - 1) * limit;
  
  const [posts, total] = await Promise.all([
    this.prisma.post.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }, // Usa índice criado
      // ...
    }),
    this.prisma.post.count()
  ]);
  
  // ...
}
```

**Impacto esperado:** 40-60% melhoria em feeds grandes

#### `findAll()` - Query de reações pode ser otimizada
**Problema:**
- Faz query separada para userReactions
- Pode ser otimizada usando `include` com filtro

**Solução:**
```typescript
include: {
  reactions: {
    where: { userId },
    select: { type: true },
    take: 1,
  },
}
```

**Impacto esperado:** 10-20% melhoria

### 3. Projects Module ⚠️ MÉDIA PRIORIDADE

#### Queries sem paginação
**Problema:**
- Similar aos outros módulos
- Não usa índices criados

**Solução:**
- Implementar paginação padrão
- Usar índices `ownerId + createdAt`

**Impacto esperado:** 30-50% melhoria

### 4. Portfolio Module ⚠️ MÉDIA PRIORIDADE

#### Queries sem paginação
**Problema:**
- Similar aos outros módulos
- Não usa índices criados

**Solução:**
- Implementar paginação padrão
- Usar índices `userId + createdAt`

**Impacto esperado:** 30-50% melhoria

## 📊 Priorização

### Crítico (Implementar Agora)
1. ✅ **Auth Module** - JÁ IMPLEMENTADO
2. ⚠️ **Users.searchUsers** - Paginação + uso de índices
3. ⚠️ **Posts.findAll** - Paginação + uso de índices

### Importante (Próxima Sprint)
4. **Projects** - Paginação padrão
5. **Portfolio** - Paginação padrão
6. **Users.getMe** - Otimização de relações

### Médio (Backlog)
7. **Caching Layer** - Redis para cache de queries frequentes
8. **Query Optimization** - Revisar todas as queries N+1
9. **Database Connection Pooling** - Otimizar pool de conexões

## 🎯 Próximos Passos

1. Criar DTO padrão de paginação (`PaginationDto`)
2. Implementar paginação em Users.searchUsers
3. Implementar paginação em Posts.findAll
4. Executar testes de carga para validar melhorias
5. Documentar padrão de paginação no `rules.mdc`

