export interface Profile {
    id: string;
    userId: string;
    firstName?: string;
    lastName?: string;
    gender?: string;
    avatarUrl?: string;
    bio?: string;
    createdAt: Date;
    updatedAt: Date;
  }
  