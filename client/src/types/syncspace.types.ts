export type SessionRole = 'host' | 'admin' | 'editor' | 'viewer';

export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  role: SessionRole;
  guest?: boolean;
}

export interface RoomMember {
  userId: string;
  name: string;
  role: SessionRole;
}

export interface CollaborativeRoom {
  id: string;
  name: string;
  locked: boolean;
  passwordProtected: boolean;
  inviteCode: string;
  createdAt: string;
  members: RoomMember[];
}

export interface WhiteboardLine {
  id: string;
  points: number[];
  color: string;
  brushSize: number;
}

export interface WhiteboardShape {
  id: string;
  type: 'rectangle' | 'circle' | 'line' | 'text' | 'sticky';
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
  brushSize?: number;
}

export interface SessionSnapshot {
  roomId: string;
  yjsStateVector?: string;
  yjsUpdateBlob?: string;
  canvasObjects: WhiteboardShape[];
  codeDocuments: Record<string, string>;
  savedAt: string;
}

