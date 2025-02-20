import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertChoreSchema, insertHouseholdSchema } from "@shared/schema";
import { ZodError } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Household Management
  app.post("/api/households", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const data = insertHouseholdSchema.parse(req.body);
      const household = await storage.createHousehold(data);
      // Make the creator an admin
      await storage.addUserToHousehold(req.user.id, household.id, true);
      res.status(201).json(household);
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json(err.message);
      } else {
        throw err;
      }
    }
  });

  app.get("/api/households/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const household = await storage.getHousehold(parseInt(req.params.id));
    if (!household || req.user.householdId !== household.id) {
      return res.sendStatus(404);
    }
    res.json(household);
  });

  app.get("/api/households/:id/members", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const household = await storage.getHousehold(parseInt(req.params.id));
    if (!household || req.user.householdId !== household.id) {
      return res.sendStatus(404);
    }
    const members = await storage.getHouseholdMembers(household.id);
    res.json(members);
  });

  app.post("/api/households/:id/join", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const householdId = parseInt(req.params.id);
    const household = await storage.getHousehold(householdId);
    if (!household) {
      return res.status(404).json({ message: "Household not found" });
    }
    if (req.user.householdId) {
      return res.status(400).json({ message: "Already in a household" });
    }
    const user = await storage.addUserToHousehold(req.user.id, householdId);
    res.json(user);
  });

  // Chore Management
  app.get("/api/chores", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!req.user.householdId) {
      return res.status(400).json({ message: "Not part of a household" });
    }
    const chores = await storage.getChoresByHouseholdId(req.user.householdId);
    res.json(chores);
  });

  app.post("/api/chores", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!req.user.householdId) {
      return res.status(400).json({ message: "Not part of a household" });
    }
    try {
      const data = insertChoreSchema.parse(req.body);
      const chore = await storage.createChore({
        ...data,
        userId: req.user.id,
        householdId: req.user.householdId,
      });
      res.status(201).json(chore);
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json(err.message);
      } else {
        throw err;
      }
    }
  });

  app.patch("/api/chores/:id/assign", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const choreId = parseInt(req.params.id);
    const { userId } = req.body;

    const chore = await storage.getChore(choreId);
    if (!chore || chore.householdId !== req.user.householdId) {
      return res.sendStatus(404);
    }

    const assignedUser = await storage.getUser(userId);
    if (!assignedUser || assignedUser.householdId !== req.user.householdId) {
      return res.status(400).json({ message: "Invalid user assignment" });
    }

    const updated = await storage.assignChore(choreId, userId);
    res.json(updated);
  });

  app.delete("/api/chores/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const chore = await storage.getChore(parseInt(req.params.id));
    if (!chore || chore.householdId !== req.user.householdId) {
      return res.sendStatus(404);
    }
    await storage.deleteChore(chore.id);
    res.sendStatus(200);
  });

  app.patch("/api/chores/:id/toggle", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const chore = await storage.getChore(parseInt(req.params.id));
    if (!chore || chore.householdId !== req.user.householdId) {
      return res.sendStatus(404);
    }
    const updated = await storage.toggleChore(chore.id);
    res.json(updated);
  });

  const httpServer = createServer(app);
  return httpServer;
}