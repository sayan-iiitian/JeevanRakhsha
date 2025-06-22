import type { Express } from "express";
import { createServer, type Server } from "http";
import { type Server as SocketIOServer } from "socket.io";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertSosRequestSchema, insertChatMessageSchema } from "@shared/schema";

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

export function registerRoutes(app: Express, io: SocketIOServer): Server {
  setupAuth(app);

  // SOS Request routes
  app.post("/api/sos-requests", requireAuth, async (req, res) => {
    try {
      const requestData = insertSosRequestSchema.parse({
        ...req.body,
        userId: req.user!.id,
      });
      
      const sosRequest = await storage.createSosRequest(requestData);
      io.emit("new_sos_request", sosRequest);
      res.status(201).json(sosRequest);
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  app.get("/api/sos-requests", requireAuth, async (req, res) => {
    try {
      if (req.user!.role === 'ngo') {
        const requests = await storage.getSosRequestsByStatus("pending");
        res.json(requests);
      } else {
        const requests = await storage.getUserSosRequests(req.user!.id);
        res.json(requests);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch requests" });
    }
  });

  app.get("/api/sos-requests/:id", requireAuth, async (req, res) => {
    try {
      const request = await storage.getSosRequest(parseInt(req.params.id));
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      res.json(request);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch request" });
    }
  });

  app.patch("/api/sos-requests/:id/approve", requireAuth, async (req, res) => {
    try {
      if (req.user!.role !== 'ngo') {
        return res.status(403).json({ message: "Only NGOs can approve requests" });
      }

      const ngo = await storage.getNgoByUserId(req.user!.id);
      if (!ngo) {
        return res.status(404).json({ message: "NGO profile not found" });
      }

      const updatedRequest = await storage.updateSosRequest(parseInt(req.params.id), {
        status: "approved",
        assignedNgoId: ngo.id,
      });

      if (updatedRequest) {
        io.to(`user_${updatedRequest.userId}`).emit("request_approved", updatedRequest);
      }
      
      res.json({ message: "Request approved" });
    } catch (error) {
      res.status(500).json({ message: "Failed to approve request" });
    }
  });

  app.patch("/api/sos-requests/:id/complete", requireAuth, async (req, res) => {
    try {
      if (req.user!.role !== 'ngo') {
        return res.status(403).json({ message: "Only NGOs can complete requests" });
      }

      const ngo = await storage.getNgoByUserId(req.user!.id);
      if (!ngo) {
        return res.status(404).json({ message: "NGO profile not found" });
      }

      await storage.updateSosRequest(parseInt(req.params.id), {
        status: "completed",
      });

      // Award points to NGO
      await storage.updateNgoPoints(ngo.id, 15);

      res.json({ message: "Rescue completed, points awarded!" });
    } catch (error) {
      res.status(500).json({ message: "Failed to complete request" });
    }
  });

  // NGO routes
  app.get("/api/ngos", requireAuth, async (req, res) => {
    try {
      const ngos = await storage.getAllNgos();
      res.json(ngos);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch NGOs" });
    }
  });

  app.get("/api/ngo/profile", requireAuth, async (req, res) => {
    try {
      const ngo = await storage.getNgoByUserId(req.user!.id);
      if (!ngo) {
        return res.status(404).json({ message: "NGO profile not found" });
      }
      res.json(ngo);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch NGO profile" });
    }
  });

  // Chat routes
  app.get("/api/chat/:sosRequestId", requireAuth, async (req, res) => {
    try {
      const messages = await storage.getChatMessages(parseInt(req.params.sosRequestId));
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/chat/:sosRequestId", requireAuth, async (req, res) => {
    try {
      const messageData = insertChatMessageSchema.parse({
        ...req.body,
        sosRequestId: parseInt(req.params.sosRequestId),
        senderId: req.user!.id,
      });
      
      const message = await storage.createChatMessage(messageData);
      io.to(`sos_request_${messageData.sosRequestId}`).emit("new_message", message);
      res.status(201).json(message);
    } catch (error) {
      res.status(400).json({ message: "Invalid message data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
