export interface Message {
  id: string;
  user: string;
  text: string;
  timestamp: Date;
  sender_id?: string;
  mine?: boolean;
  reactions?: Record<string, string[]>;
  avatar_url?: string | null;
  edited?: boolean;
  pinned?: boolean;
  /** An admin removed it; `text` is the notice, not the words. */
  hidden?: boolean;
}
