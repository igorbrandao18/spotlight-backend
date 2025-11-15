export class ChatMessageResponseDto {
  id: string;
  content: string;
  roomId: string;
  senderId: string;
  senderName?: string;
  type: string;
  createdAt: Date;
}

