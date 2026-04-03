import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      email: string;
      role: string;
      avatarUrl: string | null;
      experiencePoints: number;
    };
  }

  interface User {
    id: string;
    username: string;
    email: string;
    role: string;
    avatarUrl: string | null;
    experiencePoints: number;
  }
}
