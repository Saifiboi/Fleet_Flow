import type { Express } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import connectMemory from "memorystore";
import { storage } from "./storage";
import { hashPassword, verifyPassword } from "./password";
import type { SessionUser, User } from "@shared/schema";

const MemoryStore = connectMemory(session);

function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    ownerId: user.ownerId ?? null,
  };
}

async function ensureDefaultAdminUser() {
  const email = process.env.ADMIN_EMAIL || "admin@example.com";
  const password = process.env.ADMIN_PASSWORD || "admin123";

  const normalizedEmail = email.toLowerCase();
  const existing = await storage.findUserByEmail(normalizedEmail);
  if (existing) {
    return;
  }

  const passwordHash = await hashPassword(password);
  await storage.createUser({
    email: normalizedEmail,
    passwordHash,
    role: "admin",
  });

  console.warn(
    `[auth] Created default admin account ${normalizedEmail}. Please change the password via the ADMIN_PASSWORD environment variable.`
  );
}

export async function initializeAuth(app: Express) {
  await ensureDefaultAdminUser();

  const sessionSecret = process.env.SESSION_SECRET || "fleetflow-dev-secret";

  app.use(
    session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      store: new MemoryStore({ checkPeriod: 1000 * 60 * 60 * 24 }),
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 8,
      },
    })
  );

  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          const user = await storage.findUserByEmail(email.toLowerCase());
          if (!user) {
            return done(null, false, { message: "Invalid email or password" });
          }

          const isValid = await verifyPassword(password, user.passwordHash);
          if (!isValid) {
            return done(null, false, { message: "Invalid email or password" });
          }

          return done(null, toSessionUser(user));
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );

  passport.serializeUser((user: SessionUser, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.findUserById(id);
      if (!user) {
        return done(null, false);
      }

      done(null, toSessionUser(user));
    } catch (error) {
      done(error as Error);
    }
  });

  app.use(passport.initialize());
  app.use(passport.session());
}

export { passport };
