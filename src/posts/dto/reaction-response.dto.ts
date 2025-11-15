export class ReactionResponseDto {
  id: string;
  type: string;
  postId: string;
  userId: string;
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: Date;
}
