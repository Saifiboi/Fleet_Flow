import type { SessionUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SessionUser {}
  }
}

export {};
