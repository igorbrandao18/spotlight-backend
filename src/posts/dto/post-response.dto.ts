export class PostResponseDto {
  id: string;
  content: string;
  description?: string;
  equipment?: string;
  location?: string;
  software?: string;
  image?: string;
  authorId: string;
  author?: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  commentsCount?: number;
  reactionsCount?: number;
}
