import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { setupAuth } from "./auth";
import { db } from "@db";
import { todos, projects, projectNotes, messages } from "@db/schema";
import { eq } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Todo routes
  app.get("/api/todos", async (req, res) => {
    if (!req.user) return res.status(401).send("Unauthorized");
    const userTodos = await db.select().from(todos).where(eq(todos.userId, req.user.id));
    res.json(userTodos);
  });

  app.post("/api/todos", async (req, res) => {
    if (!req.user) return res.status(401).send("Unauthorized");
    const { title } = req.body;
    const [todo] = await db.insert(todos).values({
      title,
      userId: req.user.id,
    }).returning();
    res.json(todo);
  });

  // Projects routes
  app.get("/api/projects", async (req, res) => {
    if (!req.user) return res.status(401).send("Unauthorized");
    const userProjects = await db.select().from(projects).where(eq(projects.userId, req.user.id));
    res.json(userProjects);
  });

  app.get("/api/projects/:id", async (req, res) => {
    if (!req.user) return res.status(401).send("Unauthorized");
    const { id } = req.params;
    const [project] = await db.select().from(projects)
      .where(eq(projects.id, parseInt(id)))
      .limit(1);

    if (!project) {
      return res.status(404).send("Project not found");
    }

    if (project.userId !== req.user.id) {
      return res.status(403).send("Unauthorized");
    }

    res.json(project);
  });

  app.post("/api/projects", async (req, res) => {
    if (!req.user) return res.status(401).send("Unauthorized");
    const { title, description } = req.body;
    const [project] = await db.insert(projects).values({
      title,
      description,
      userId: req.user.id,
    }).returning();
    res.json(project);
  });

  app.patch("/api/projects/:id", async (req, res) => {
    if (!req.user) return res.status(401).send("Unauthorized");
    const { id } = req.params;
    const { progress } = req.body;

    const [project] = await db.select().from(projects)
      .where(eq(projects.id, parseInt(id)))
      .limit(1);

    if (!project) {
      return res.status(404).send("Project not found");
    }

    if (project.userId !== req.user.id) {
      return res.status(403).send("Unauthorized");
    }

    const [updatedProject] = await db.update(projects)
      .set({ progress })
      .where(eq(projects.id, parseInt(id)))
      .returning();

    res.json(updatedProject);
  });

  // Project notes routes
  app.get("/api/projects/:projectId/notes", async (req, res) => {
    if (!req.user) return res.status(401).send("Unauthorized");
    const { projectId } = req.params;

    const [project] = await db.select().from(projects)
      .where(eq(projects.id, parseInt(projectId)))
      .limit(1);

    if (!project) {
      return res.status(404).send("Project not found");
    }

    if (project.userId !== req.user.id) {
      return res.status(403).send("Unauthorized");
    }

    const notes = await db.select().from(projectNotes)
      .where(eq(projectNotes.projectId, parseInt(projectId)));
    res.json(notes);
  });

  app.post("/api/projects/:projectId/notes", async (req, res) => {
    if (!req.user) return res.status(401).send("Unauthorized");
    const { projectId } = req.params;
    const { content } = req.body;

    const [project] = await db.select().from(projects)
      .where(eq(projects.id, parseInt(projectId)))
      .limit(1);

    if (!project) {
      return res.status(404).send("Project not found");
    }

    if (project.userId !== req.user.id) {
      return res.status(403).send("Unauthorized");
    }

    const [note] = await db.insert(projectNotes).values({
      content,
      projectId: parseInt(projectId),
      userId: req.user.id,
    }).returning();
    res.json(note);
  });

  const httpServer = createServer(app);

  // WebSocket setup for chat
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws) => {
    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === "chat") {
          const [savedMessage] = await db.insert(messages).values({
            content: message.content,
            userId: message.userId,
          }).returning();

          // Broadcast to all clients
          wss.clients.forEach((client) => {
            client.send(JSON.stringify(savedMessage));
          });
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });
  });

  return httpServer;
}