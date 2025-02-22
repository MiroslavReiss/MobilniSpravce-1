import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { setupAuth } from "./auth";
import { db } from "@db";
import { todos, projects, projectNotes, messages, users, notifications, activityLogs } from "@db/schema";
import { eq, sql, desc } from "drizzle-orm";
import fileUpload from "express-fileupload";
import path from "path";
import { randomBytes } from "crypto";
import express from 'express';
import { sendPushNotification } from './services/notifications';

export function registerRoutes(app: Express): Server {
  const requireAuth = setupAuth(app);

  // Setup file upload middleware
  app.use(fileUpload({
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max file size
    abortOnLimit: true,
    createParentPath: true,
    useTempFiles: true,
    tempFileDir: '/tmp/'
  }));

  // Add avatar upload endpoint
  app.post("/api/user/avatar", requireAuth, async (req, res) => {
    try {
      if (!req.files || !req.files.avatar) {
        return res.status(400).send("No file uploaded");
      }

      const avatar = req.files.avatar;

      if (Array.isArray(avatar)) {
        return res.status(400).send("Multiple files not allowed");
      }

      if (!avatar.mimetype.startsWith('image/')) {
        return res.status(400).send("Only images are allowed");
      }

      // Generate unique filename
      const fileExt = path.extname(avatar.name);
      const fileName = `${randomBytes(16).toString('hex')}${fileExt}`;
      const uploadPath = path.join(process.cwd(), 'uploads', fileName);

      // Move file to uploads directory
      await avatar.mv(uploadPath);

      // Update user's avatar URL in database
      const avatarUrl = `/uploads/${fileName}`;
      const [updatedUser] = await db.update(users)
        .set({ avatar: avatarUrl })
        .where(eq(users.id, req.user!.id))
        .returning();

      // Create activity log
      await logActivity(
        req.user!.id,
        "update_avatar",
        "user",
        req.user!.id,
        "Updated profile avatar"
      );

      res.json({ avatarUrl });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      res.status(500).send("Failed to upload avatar");
    }
  });

  // Serve uploaded files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

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
        noteCount: sql`count(${projectNotes.id})::int`
      })
      .from(projects)
      .leftJoin(projectNotes, eq(projects.id, projectNotes.projectId))
      .where(eq(projects.userId, req.user!.id))
      .groupBy(projects.id);

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

    // Log the project data for debugging
    console.log('Project data:', project);

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

    console.log('Update project progress:', { id, progress }); // Debug log

    const [project] = await db.select().from(projects)
      .where(eq(projects.id, parseInt(id)))
      .limit(1);

    if (!project) {
      return res.status(404).send("Project not found");
    }

    if (project.userId !== req.user!.id) {
      return res.status(403).send("Unauthorized");
    }

    try {
      const [updatedProject] = await db.update(projects)
        .set({ progress: parseInt(progress.toString()) })
        .where(eq(projects.id, parseInt(id)))
        .returning();

      console.log('Updated project:', updatedProject); // Debug log

      // Create activity log
      await logActivity(
        req.user!.id,
        "update_progress",
        "project",
        project.id,
        `Progress updated to ${progress}%`
      );

      res.json(updatedProject);
    } catch (error) {
      console.error('Error updating project progress:', error);
      res.status(500).send("Failed to update project progress");
    }
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

    const notes = await db.select({
      id: projectNotes.id,
      content: projectNotes.content,
      createdAt: projectNotes.createdAt,
      userId: projectNotes.userId,
      username: users.username,
      displayName: users.displayName,
    })
      .from(projectNotes)
      .leftJoin(users, eq(projectNotes.userId, users.id))
      .where(eq(projectNotes.projectId, parseInt(projectId)))
      .orderBy(projectNotes.createdAt);

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

    // Return note with user info
    const [noteWithUser] = await db.select({
      id: projectNotes.id,
      content: projectNotes.content,
      createdAt: projectNotes.createdAt,
      userId: projectNotes.userId,
      username: users.username,
      displayName: users.displayName,
    })
      .from(projectNotes)
      .leftJoin(users, eq(projectNotes.userId, users.id))
      .where(eq(projectNotes.id, note.id))
      .limit(1);

    res.json(noteWithUser);
  });

  // Notifications routes
  app.get("/api/notifications", requireAuth, async (req, res) => {
    const userNotifications = await db.select()
      .from(notifications)
      .where(eq(notifications.userId, req.user!.id))
      .orderBy(desc(notifications.createdAt));
    res.json(userNotifications);
  });

  app.post("/api/notifications/:id/read", requireAuth, async (req, res) => {
    const { id } = req.params;
    const [notification] = await db.select()
      .from(notifications)
      .where(eq(notifications.id, parseInt(id)))
      .limit(1);

    if (!notification) {
      return res.status(404).send("Notification not found");
    }

    if (notification.userId !== req.user!.id) {
      return res.status(403).send("Unauthorized");
    }

    const [updated] = await db.update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, parseInt(id)))
      .returning();

    res.json(updated);
  });

  // Activity logs routes
  app.get("/api/activity-logs", requireAuth, async (req, res) => {
    const logs = await db.select({
      id: activityLogs.id,
      action: activityLogs.action,
      entityType: activityLogs.entityType,
      entityId: activityLogs.entityId,
      details: activityLogs.details,
      createdAt: activityLogs.createdAt,
      username: users.username,
      displayName: users.displayName,
    })
      .from(activityLogs)
      .leftJoin(users, eq(activityLogs.userId, users.id))
      .orderBy(desc(activityLogs.createdAt))
      .limit(100);

    res.json(logs);
  });

  // Helper function to create activity logs
  async function logActivity(
    userId: number,
    action: string,
    entityType: string,
    entityId?: number,
    details?: string
  ) {
    await db.insert(activityLogs).values({
      userId,
      action,
      entityType,
      entityId,
      details,
    });
  }

  // Helper function to create notifications
  async function createNotification(
    userId: number,
    title: string,
    message: string,
    type: string
  ) {
    await db.insert(notifications).values({
      userId,
      title,
      message,
      type,
    });
  }

  // Funkce pro ověření, zda je uživatel MadKoala
  function isMadKoala(req: express.Request): boolean {
    return req.user?.username === 'madkoala';
  }

  // Delete project note
  app.delete("/api/projects/:projectId/notes/:noteId", requireAuth, async (req, res) => {
    const { projectId, noteId } = req.params;

    if (!isMadKoala(req)) {
      return res.status(403).send("Pouze uživatel MadKoala může mazat poznámky");
    }

    const [project] = await db.select().from(projects)
      .where(eq(projects.id, parseInt(projectId)))
      .limit(1);

    if (!project) {
      return res.status(404).send("Projekt nenalezen");
    }

    if (project.userId !== req.user!.id) {
      return res.status(403).send("Neautorizovaný přístup");
    }

    await db.delete(projectNotes)
      .where(eq(projectNotes.id, parseInt(noteId)));

    // Log activity
    await logActivity(
      req.user!.id,
      "delete_note",
      "project_note",
      parseInt(noteId),
      "Poznámka smazána"
    );

    res.status(200).send();
  });

  // Edit project note
  app.patch("/api/projects/:projectId/notes/:noteId", requireAuth, async (req, res) => {
    const { projectId, noteId } = req.params;
    const { content } = req.body;

    if (!isMadKoala(req)) {
      return res.status(403).send("Pouze uživatel MadKoala může editovat poznámky");
    }

    const [project] = await db.select().from(projects)
      .where(eq(projects.id, parseInt(projectId)))
      .limit(1);

    if (!project) {
      return res.status(404).send("Projekt nenalezen");
    }

    if (project.userId !== req.user!.id) {
      return res.status(403).send("Neautorizovaný přístup");
    }

    const [updatedNote] = await db.update(projectNotes)
      .set({ content })
      .where(eq(projectNotes.id, parseInt(noteId)))
      .returning();

    // Log activity
    await logActivity(
      req.user!.id,
      "edit_note",
      "project_note",
      parseInt(noteId),
      "Poznámka upravena"
    );

    res.json(updatedNote);
  });

    // Delete project
  app.delete("/api/projects/:id", requireAuth, async (req, res) => {
    const { id } = req.params;

    if (!isMadKoala(req)) {
      return res.status(403).send("Pouze uživatel MadKoala může mazat projekty");
    }

    const [project] = await db.select().from(projects)
      .where(eq(projects.id, parseInt(id)))
      .limit(1);

    if (!project) {
      return res.status(404).send("Projekt nenalezen");
    }

    if (project.userId !== req.user!.id) {
      return res.status(403).send("Neautorizovaný přístup");
    }

    // Delete associated notes first
    await db.delete(projectNotes)
      .where(eq(projectNotes.projectId, parseInt(id)));

    // Then delete the project
    await db.delete(projects)
      .where(eq(projects.id, parseInt(id)));

    // Log activity
    await logActivity(
      req.user!.id,
      "delete_project",
      "project",
      parseInt(id),
      "Projekt smazán"
    );

    res.status(200).send();
  });

  // Delete todo
  app.delete("/api/todos/:id", requireAuth, async (req, res) => {
    const { id } = req.params;

    if (!isMadKoala(req)) {
      return res.status(403).send("Pouze uživatel MadKoala může mazat úkoly");
    }

    const [todo] = await db.select().from(todos)
      .where(eq(todos.id, parseInt(id)))
      .limit(1);

    if (!todo) {
      return res.status(404).send("Úkol nenalezen");
    }

    if (todo.userId !== req.user!.id) {
      return res.status(403).send("Neautorizovaný přístup");
    }

    await db.delete(todos)
      .where(eq(todos.id, parseInt(id)));

    // Log activity
    await logActivity(
      req.user!.id,
      "delete_todo",
      "todo",
      parseInt(id),
      "Úkol smazán"
    );

    res.status(200).send();
  });

  // Edit todo
  app.patch("/api/todos/:id/edit", requireAuth, async (req, res) => {
    const { id } = req.params;
    const { title } = req.body;

    if (!isMadKoala(req)) {
      return res.status(403).send("Pouze uživatel MadKoala může editovat úkoly");
    }

    const [todo] = await db.select().from(todos)
      .where(eq(todos.id, parseInt(id)))
      .limit(1);

    if (!todo) {
      return res.status(404).send("Úkol nenalezen");
    }

    if (todo.userId !== req.user!.id) {
      return res.status(403).send("Neautorizovaný přístup");
    }

    const [updatedTodo] = await db.update(todos)
      .set({ title })
      .where(eq(todos.id, parseInt(id)))
      .returning();

    // Log activity
    await logActivity(
      req.user!.id,
      "edit_todo",
      "todo",
      parseInt(id),
      "Úkol upraven"
    );

    res.json(updatedTodo);
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
          const [user] = await db.select({
            username: users.username,
            displayName: users.displayName,
          })
            .from(users)
            .where(eq(users.id, message.userId))
            .limit(1);

          // Store user ID with the connection
          (ws as any).userId = message.userId;
          connectedClients.set(ws, message.userId);

          // Get all users and their external IDs
          const allUsers = await db.select({
            id: users.id,
            username: users.username,
            externalId: users.externalId,
          }).from(users);

          // Determine offline users (users not in connectedClients)
          const connectedUserIds = Array.from(connectedClients.values());
          const offlineUsers = allUsers.filter(u =>
            !connectedUserIds.includes(u.id) &&
            u.id !== message.userId &&
            u.externalId // Only include users with external IDs
          );

          // If there are offline users, send them a push notification
          if (offlineUsers.length > 0) {
            const senderName = user.displayName || user.username;
            try {
              await sendPushNotification(
                "Nová zpráva",
                `${senderName}: ${message.content}`,
                offlineUsers.map(u => u.externalId!),
              );
            } catch (error) {
              console.error('Failed to send push notification:', error);
            }
          }

          // Create notification for all other users
          for (const otherUser of allUsers) {
            if (otherUser.id !== message.userId) {
              await createNotification(
                otherUser.id,
                "Nová zpráva",
                `${user.displayName || user.username} poslal(a) novou zprávu`,
                "chat"
              );
            }
          }

          // Broadcast to all clients
          const fullMessage = {
            type: "message",
            data: {
              ...savedMessage,
              username: user.username,
              displayName: user.displayName,
              onlineUsers: Array.from(connectedClients.values())
            }
          };

          wss.clients.forEach((client) => {
            client.send(JSON.stringify(fullMessage));
          });

          // Log activity
          await logActivity(
            message.userId,
            "send_message",
            "chat",
            savedMessage.id,
            "Odeslána nová zpráva"
          );
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