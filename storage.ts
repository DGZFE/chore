import { users, type User, type InsertUser, type Chore, type InsertChore, type Household, type InsertHousehold } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User>;

  // Household operations
  getHousehold(id: number): Promise<Household | undefined>;
  createHousehold(household: InsertHousehold): Promise<Household>;
  getHouseholdMembers(householdId: number): Promise<User[]>;
  addUserToHousehold(userId: number, householdId: number, isAdmin?: boolean): Promise<User>;

  // Chore operations
  getChore(id: number): Promise<Chore | undefined>;
  getChoresByHouseholdId(householdId: number): Promise<Chore[]>;
  getChoresByUserId(userId: number): Promise<Chore[]>;
  createChore(chore: InsertChore & { userId: number; householdId: number }): Promise<Chore>;
  deleteChore(id: number): Promise<void>;
  toggleChore(id: number): Promise<Chore>;
  assignChore(choreId: number, userId: number): Promise<Chore>;

  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private households: Map<number, Household>;
  private chores: Map<number, Chore>;
  sessionStore: session.Store;
  currentId: number;
  currentHouseholdId: number;
  currentChoreId: number;

  constructor() {
    this.users = new Map();
    this.households = new Map();
    this.chores = new Map();
    this.currentId = 1;
    this.currentHouseholdId = 1;
    this.currentChoreId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { 
      ...insertUser, 
      id, 
      householdId: null, 
      isHouseholdAdmin: false 
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");
    const updated = { ...user, ...data };
    this.users.set(id, updated);
    return updated;
  }

  async getHousehold(id: number): Promise<Household | undefined> {
    return this.households.get(id);
  }

  async createHousehold(household: InsertHousehold): Promise<Household> {
    const id = this.currentHouseholdId++;
    const newHousehold: Household = { ...household, id };
    this.households.set(id, newHousehold);
    return newHousehold;
  }

  async getHouseholdMembers(householdId: number): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.householdId === householdId,
    );
  }

  async addUserToHousehold(
    userId: number, 
    householdId: number, 
    isAdmin: boolean = false
  ): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    const household = await this.getHousehold(householdId);
    if (!household) throw new Error("Household not found");

    const updated = await this.updateUser(userId, {
      householdId,
      isHouseholdAdmin: isAdmin,
    });

    return updated;
  }

  async getChore(id: number): Promise<Chore | undefined> {
    return this.chores.get(id);
  }

  async getChoresByHouseholdId(householdId: number): Promise<Chore[]> {
    return Array.from(this.chores.values()).filter(
      (chore) => chore.householdId === householdId,
    );
  }

  async getChoresByUserId(userId: number): Promise<Chore[]> {
    return Array.from(this.chores.values()).filter(
      (chore) => chore.userId === userId || chore.assignedTo === userId,
    );
  }

  async createChore(data: InsertChore & { userId: number; householdId: number }): Promise<Chore> {
    const id = this.currentChoreId++;
    const chore: Chore = {
      id,
      userId: data.userId,
      householdId: data.householdId,
      name: data.name,
      reward: data.reward,
      completed: false,
      assignedTo: data.assignedTo || null,
    };
    this.chores.set(id, chore);
    return chore;
  }

  async deleteChore(id: number): Promise<void> {
    this.chores.delete(id);
  }

  async toggleChore(id: number): Promise<Chore> {
    const chore = this.chores.get(id);
    if (!chore) {
      throw new Error("Chore not found");
    }
    const updated: Chore = { ...chore, completed: !chore.completed };
    this.chores.set(id, updated);
    return updated;
  }

  async assignChore(choreId: number, userId: number): Promise<Chore> {
    const chore = await this.getChore(choreId);
    if (!chore) throw new Error("Chore not found");

    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    const updated: Chore = { ...chore, assignedTo: userId };
    this.chores.set(choreId, updated);
    return updated;
  }
}

export const storage = new MemStorage();