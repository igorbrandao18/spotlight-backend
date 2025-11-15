export class CommentResponseDto {
  id: string;
  content: string;
  postId: string;
  authorId: string;
  author?: {
    id: string;
    name: string;
    avatar?: string;
  };
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
  replies?: CommentResponseDto[];
}
