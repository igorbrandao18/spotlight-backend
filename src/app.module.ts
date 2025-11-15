import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PostsModule } from './posts/posts.module';
import { ProjectsModule } from './projects/projects.module';
import { ChatModule } from './chat/chat.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { PartnerStoresModule } from './partner-stores/partner-stores.module';
import { ReportsModule } from './reports/reports.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

// Rate limiting configuration - more permissive in development/testing
const isProduction = process.env.NODE_ENV === 'production';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    // Rate limiting configuration - adjusted for development/testing environments
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000, // 1 minute
        limit: isProduction ? 100 : 1000, // More permissive in dev/test
      },
      {
        name: 'medium',
        ttl: 900000, // 15 minutes
        limit: isProduction ? 5 : 100, // More permissive in dev/test for load testing
      },
      {
        name: 'long',
        ttl: 3600000, // 1 hour
        limit: isProduction ? 3 : 100, // More permissive in dev/test for load testing
      },
    ]),
    AuthModule,
    UsersModule,
    PostsModule,
    ProjectsModule,
    ChatModule,
    PortfolioModule,
    PartnerStoresModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
