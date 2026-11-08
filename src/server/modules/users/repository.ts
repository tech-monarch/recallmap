import { eq } from "drizzle-orm";
import type { Db } from "../../db/client";
import { users } from "../../db/schema";
import type { UserContext } from "../../platform/request-context";
import { requireUser } from "../shared";

export type UserProfile = Readonly<{
  id: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  avatarUrl: string | null;
  onboarded: boolean;
}>;

export type NewUser = { email: string; emailVerified: boolean; name?: string | null; avatarUrl?: string | null };

export class UsersRepository {
  constructor(private readonly db: Db) {}

  /** Account creation is not user-scoped (the user does not exist yet). The OAuth module (B2) is the caller. */
  async create(input: NewUser): Promise<string> {
    const [row] = await this.db
      .insert(users)
      .values({ email: input.email, emailVerified: input.emailVerified, name: input.name ?? null, avatarUrl: input.avatarUrl ?? null })
      .returning({ id: users.id });
    return row.id;
  }

  async getProfile(ctx: UserContext): Promise<UserProfile | null> {
    const userId = requireUser(ctx);
    const [row] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!row) return null;
    return { id: row.id, email: row.email, emailVerified: row.emailVerified, name: row.name, avatarUrl: row.avatarUrl, onboarded: row.onboardedAt !== null };
  }
}
