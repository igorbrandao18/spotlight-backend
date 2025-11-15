export class ChatRoomResponseDto {
  id: string;
  name?: string;
  isGroup: boolean;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
  members: {
    id: string;
    name: string;
    avatar?: string;
  }[];
}
