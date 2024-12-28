import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, insertUserSchema, type SelectUser } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);
const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64
    )) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  },
};

// Globální stav pro povolení/zakázání registrací
let registrationsEnabled = true;

// extend express user object with our schema
declare global {
  namespace Express {
    interface User extends SelectUser { }
  }
}

// Auth middleware - přesunuto na začátek
const createRequireAuth = () => {
  return (req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }
    next();
  };
};

export function setupAuth(app: Express) {
  const requireAuth = createRequireAuth();
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "development-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { 
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 dní
    },
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    sessionSettings.cookie = {
      ...sessionSettings.cookie,
      secure: true,
      sameSite: "lax"
    };
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Funkce pro ověření admin práv
  function isMadKoala(req: Express.Request): boolean {
    return req.user?.username === 'madkoala';
  }

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!user) {
          return done(null, false, { message: "Nesprávné uživatelské jméno." });
        }
        const isMatch = await crypto.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Nesprávné heslo." });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Admin endpoints
  app.get("/api/admin/users", requireAuth, async (req, res) => {
    if (!isMadKoala(req)) {
      return res.status(403).send("Přístup odepřen");
    }

    const allUsers = await db.select().from(users);
    res.json(allUsers);
  });

  app.patch("/api/admin/users/:id", requireAuth, async (req, res) => {
    if (!isMadKoala(req)) {
      return res.status(403).send("Přístup odepřen");
    }

    const { id } = req.params;
    const { username, displayName, password } = req.body;

    try {
      const updateData: Partial<SelectUser> = {};
      if (username) updateData.username = username;
      if (displayName) updateData.displayName = displayName;
      if (password) {
        updateData.password = await crypto.hash(password);
      }

      const [updatedUser] = await db.update(users)
        .set(updateData)
        .where(eq(users.id, parseInt(id)))
        .returning();

      res.json(updatedUser);
    } catch (error) {
      res.status(500).send("Chyba při aktualizaci uživatele");
    }
  });

  app.delete("/api/admin/users/:id", requireAuth, async (req, res) => {
    if (!isMadKoala(req)) {
      return res.status(403).send("Přístup odepřen");
    }

    const { id } = req.params;

    if (req.user?.id === parseInt(id)) {
      return res.status(400).send("Nelze smazat vlastní účet");
    }

    try {
      await db.delete(users).where(eq(users.id, parseInt(id)));
      res.status(200).send("Uživatel byl smazán");
    } catch (error) {
      res.status(500).send("Chyba při mazání uživatele");
    }
  });

  app.post("/api/admin/registrations", requireAuth, async (req, res) => {
    if (!isMadKoala(req)) {
      return res.status(403).send("Přístup odepřen");
    }

    const { enabled } = req.body;
    registrationsEnabled = enabled;
    res.json({ registrationsEnabled });
  });

  app.get("/api/admin/registrations", requireAuth, async (req, res) => {
    if (!isMadKoala(req)) {
      return res.status(403).send("Přístup odepřen");
    }

    res.json({ registrationsEnabled });
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      if (!registrationsEnabled) {
        return res.status(403).send("Registrace jsou momentálně zakázány");
      }

      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .send("Neplatný vstup: " + result.error.issues.map(i => i.message).join(", "));
      }

      const { username, password } = result.data;

      // Check if user already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        return res.status(400).send("Uživatelské jméno již existuje");
      }

      // Hash the password
      const hashedPassword = await crypto.hash(password);

      // Create the new user
      const [newUser] = await db
        .insert(users)
        .values({
          username,
          password: hashedPassword,
          displayName: username,
        })
        .returning();

      // Log the user in after registration
      req.login(newUser, (err) => {
        if (err) {
          return next(err);
        }
        return res.json({
          message: "Registrace byla úspěšná",
          user: { 
            id: newUser.id, 
            username: newUser.username,
            displayName: newUser.displayName,
            avatar: newUser.avatar
          },
        });
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    const result = insertUserSchema.safeParse(req.body);
    if (!result.success) {
      return res
        .status(400)
        .send("Neplatný vstup: " + result.error.issues.map(i => i.message).join(", "));
    }

    const cb = (err: any, user: Express.User | false, info: IVerifyOptions) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.status(400).send(info.message ?? "Přihlášení selhalo");
      }

      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }

        return res.json({
          message: "Přihlášení úspěšné",
          user: {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatar: user.avatar
          },
        });
      });
    };
    passport.authenticate("local", cb)(req, res, next);
  });

  app.post("/api/logout", requireAuth, (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).send("Odhlášení selhalo");
      }
      res.json({ message: "Odhlášení úspěšné" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      return res.json({
        id: req.user.id,
        username: req.user.username,
        displayName: req.user.displayName,
        avatar: req.user.avatar,
        isAdmin: req.user.username === 'madkoala'
      });
    }
    res.status(401).send("Nejste přihlášeni");
  });

  return requireAuth;
}