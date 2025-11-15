import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export class TestHelpers {
  /**
   * Create a test user with Argon2 hashed password by default
   * Can optionally create with BCrypt hash for testing migration scenarios
   */
  static async createUser(overrides: Partial<any> = {}) {
    // Default password meets new requirements: min 8 chars, uppercase, lowercase, number
    const defaultPassword = 'SecurePass123';
    const passwordToHash = (overrides.password as string) || defaultPassword;
    
    // Use Argon2 by default, but allow BCrypt for migration tests
    const useBcrypt = overrides._useBcrypt === true;
    delete overrides._useBcrypt; // Remove internal flag
    
    const hashedPassword = useBcrypt
      ? await bcrypt.hash(passwordToHash, 10)
      : await argon2.hash(passwordToHash, {
          type: argon2.argon2id,
          memoryCost: 65536,
          timeCost: 3,
          parallelism: 4,
        });
    
    return prisma.user.create({
      data: {
        email: overrides.email || `test${Date.now()}@example.com`,
        name: 'Test User',
        password: hashedPassword,
        areaActivity: 'Photography',
        ...overrides,
        password: hashedPassword,
      },
    });
  }

  static async createPost(authorId: string, overrides: Partial<any> = {}) {
    return prisma.post.create({
      data: {
        content: 'Test post content',
        authorId,
        ...overrides,
      },
    });
  }

  static async createProject(ownerId: string, overrides: Partial<any> = {}) {
    return prisma.project.create({
      data: {
        title: 'Test Project',
        ownerId,
        status: 'TODO',
        ...overrides,
      },
    });
  }

  static async cleanup() {
    // Delete in correct order to respect foreign keys to avoid deadlocks
    try {
      // Disable triggers temporarily to avoid FK constraint issues
      await prisma.$executeRawUnsafe(
        `SET session_replication_role = 'replica';`,
      );

      // Delete in reverse dependency order
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE 
        "reports", 
        "portfolio_likes", 
        "portfolio_comments", 
        "portfolio_media", 
        "portfolio_items",
        "partner_store_equipment_images",
        "partner_store_equipments",
        "partner_stores",
        "chat_messages",
        "chat_room_members",
        "chat_rooms",
        "project_milestones",
        "project_members",
        "projects",
        "post_reactions",
        "post_comments",
        "posts",
        "follows",
        "refresh_tokens",
        "user_preferences",
        "rates",
        "availabilities",
        "locations",
        "websites",
        "social_links",
        "users"
      CASCADE;`);

      await prisma.$executeRawUnsafe(
        `SET session_replication_role = 'origin';`,
      );
    } catch {
      // If truncate fails, try individual deletes
      try {
        await prisma.report.deleteMany();
        await prisma.portfolioLike.deleteMany();
        await prisma.portfolioComment.deleteMany();
        await prisma.portfolioMedia.deleteMany();
        await prisma.portfolioItem.deleteMany();
        await prisma.partnerStoreEquipmentImage.deleteMany();
        await prisma.partnerStoreEquipment.deleteMany();
        await prisma.partnerStore.deleteMany();
        await prisma.chatMessage.deleteMany();
        await prisma.chatRoomMember.deleteMany();
        await prisma.chatRoom.deleteMany();
        await prisma.projectMilestone.deleteMany();
        await prisma.projectMember.deleteMany();
        await prisma.project.deleteMany();
        await prisma.postReaction.deleteMany();
        await prisma.postComment.deleteMany();
        await prisma.post.deleteMany();
        await prisma.follow.deleteMany();
        await prisma.refreshToken.deleteMany();
        await prisma.userPreferences.deleteMany();
        await prisma.rate.deleteMany();
        await prisma.availability.deleteMany();
        await prisma.location.deleteMany();
        await prisma.website.deleteMany();
        await prisma.socialLink.deleteMany();
        await prisma.user.deleteMany();
      } catch {
        // Ignore errors during cleanup
      }
    }
  }

  static async getAuthToken(
    email: string,
    password: string,
    app: any,
  ): Promise<string> {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password },
    });

    const body = JSON.parse(response.body);
    // Support both old and new response formats
    return body.tokens?.accessToken || body.jwtToken;
  }
}
