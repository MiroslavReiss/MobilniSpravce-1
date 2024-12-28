import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { setupAuth } from "./auth";
import { db } from "@db";
import { todos, projects, projectNotes, messages, users } from "@db/schema";
import { eq, sql } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  const requireAuth = setupAuth(app);

  // Add PATCH endpoint for todo toggle
  app.patch("/api/todos/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    const { completed } = req.body;

    const [todo] = await db.select().from(todos)
      .where(eq(todos.id, parseInt(id)))
      .limit(1);

    if (!todo) {
      return res.status(404).send("Todo not found");
    }

    if (todo.userId !== req.user!.id) {
      return res.status(403).send("Unauthorized");
    }

    const [updatedTodo] = await db.update(todos)
      .set({ completed })
      .where(eq(todos.id, parseInt(id)))
      .returning();

    res.json(updatedTodo);
  });

  // Load previous messages with user status
  app.get("/api/messages", requireAuth, async (req, res) => {
    const messageHistory = await db.select({
      id: messages.id,
      content: messages.content,
      userId: messages.userId,
      createdAt: messages.createdAt,
      username: users.username,
      displayName: users.displayName,
    })
    .from(messages)
    .leftJoin(users, eq(messages.userId, users.id))
    .orderBy(messages.createdAt)
    .limit(100);

    // Get online users
    const onlineUsers = Array.from(wss.clients).map(client => (client as any).userId).filter(Boolean);

    res.json({
      messages: messageHistory,
      onlineUsers
    });
  });

  // Todo routes
  app.get("/api/todos", requireAuth, async (req, res) => {
    const userTodos = await db.select().from(todos).where(eq(todos.userId, req.user!.id));
    res.json(userTodos);
  });

  app.post("/api/todos", requireAuth, async (req, res) => {
    const { title } = req.body;
    const [todo] = await db.insert(todos).values({
      title,
      userId: req.user!.id,
    }).returning();
    res.json(todo);
  });

  // Projects routes
  app.get("/api/projects", requireAuth, async (req, res) => {
    const userProjects = await db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        progress: projects.progress,
        noteCount: db
          .select({ count: sql`count(*)` })
          .from(projectNotes)
          .where(eq(projectNotes.projectId, projects.id))
          .limit(1),
      })
      .from(projects)
      .where(eq(projects.userId, req.user!.id));

    res.json(userProjects);
  });

  app.get("/api/projects/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    const [project] = await db.select().from(projects)
      .where(eq(projects.id, parseInt(id)))
      .limit(1);

    if (!project) {
      return res.status(404).send("Project not found");
    }

    if (project.userId !== req.user!.id) {
      return res.status(403).send("Unauthorized");
    }

    res.json(project);
  });

  app.post("/api/projects", requireAuth, async (req, res) => {
    const { title, description } = req.body;
    const [project] = await db.insert(projects).values({
      title,
      description,
      userId: req.user!.id,
    }).returning();
    res.json(project);
  });

  app.patch("/api/projects/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    const { progress } = req.body;

    const [project] = await db.select().from(projects)
      .where(eq(projects.id, parseInt(id)))
      .limit(1);

    if (!project) {
      return res.status(404).send("Project not found");
    }

    if (project.userId !== req.user!.id) {
      return res.status(403).send("Unauthorized");
    }

    const [updatedProject] = await db.update(projects)
      .set({ progress })
      .where(eq(projects.id, parseInt(id)))
      .returning();

    res.json(updatedProject);
  });

  // Project notes routes
  app.get("/api/projects/:projectId/notes", requireAuth, async (req, res) => {
    const { projectId } = req.params;

    const [project] = await db.select().from(projects)
      .where(eq(projects.id, parseInt(projectId)))
      .limit(1);

    if (!project) {
      return res.status(404).send("Project not found");
    }

    if (project.userId !== req.user!.id) {
      return res.status(403).send("Unauthorized");
    }

    const notes = await db.select().from(projectNotes)
      .where(eq(projectNotes.projectId, parseInt(projectId)));
    res.json(notes);
  });

  app.post("/api/projects/:projectId/notes", requireAuth, async (req, res) => {
    const { projectId } = req.params;
    const { content } = req.body;

    const [project] = await db.select().from(projects)
      .where(eq(projects.id, parseInt(projectId)))
      .limit(1);

    if (!project) {
      return res.status(404).send("Project not found");
    }

    if (project.userId !== req.user!.id) {
      return res.status(403).send("Unauthorized");
    }

    const [note] = await db.insert(projectNotes).values({
      content,
      projectId: parseInt(projectId),
      userId: req.user!.id,
    }).returning();
    res.json(note);
  });

  const httpServer = createServer(app);

  // WebSocket setup for chat
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  const connectedClients = new Map();

  wss.on("connection", (ws) => {
    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === "chat") {
          const [savedMessage] = await db.insert(messages).values({
            content: message.content,
            userId: message.userId,
          }).returning();

          // Get user info
          const [user] = await db
            .select({
              username: users.username,
              displayName: users.displayName,
            })
            .from(users)
            .where(eq(users.id, message.userId))
            .limit(1);

          // Store user ID with the connection
          (ws as any).userId = message.userId;
          connectedClients.set(ws, message.userId);

          // Broadcast to all clients with user info and online status
          const fullMessage = {
            ...savedMessage,
            username: user.username,
            displayName: user.displayName,
            onlineUsers: Array.from(connectedClients.values())
          };

          wss.clients.forEach((client) => {
            client.send(JSON.stringify({
              type: "message",
              data: fullMessage
            }));
          });
        }

        // Handle read receipt
        if (message.type === "read") {
          wss.clients.forEach((client) => {
            client.send(JSON.stringify({
              type: "read",
              userId: message.userId,
              messageId: message.messageId
            }));
          });
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });

    // Handle disconnection
    ws.on("close", () => {
      const userId = connectedClients.get(ws);
      connectedClients.delete(ws);

      // Broadcast updated online users list
      wss.clients.forEach((client) => {
        client.send(JSON.stringify({
          type: "userOffline",
          userId,
          onlineUsers: Array.from(connectedClients.values())
        }));
      });
    });
  });

  return httpServer;
}