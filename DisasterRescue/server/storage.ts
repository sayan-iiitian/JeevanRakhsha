import { users, ngos, sosRequests, chatMessages, type User, type InsertUser, type Ngo, type InsertNgo, type SosRequest, type InsertSosRequest, type ChatMessage, type InsertChatMessage } from "@shared/schema";
import session, { type Store } from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getNgo(id: number): Promise<Ngo | undefined>;
  getNgoByUserId(userId: number): Promise<Ngo | undefined>;
  createNgo(ngo: InsertNgo): Promise<Ngo>;
  getAllNgos(): Promise<Ngo[]>;
  updateNgoPoints(ngoId: number, points: number): Promise<void>;
  
  getSosRequest(id: number): Promise<SosRequest | undefined>;
  createSosRequest(request: InsertSosRequest): Promise<SosRequest>;
  getSosRequestsByStatus(status: string): Promise<SosRequest[]>;
  getUserSosRequests(userId: number): Promise<SosRequest[]>;
  updateSosRequest(id: number, updates: Partial<SosRequest>): Promise<SosRequest | undefined>;
  
  getChatMessages(sosRequestId: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  
  sessionStore: Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private ngos: Map<number, Ngo>;
  private sosRequests: Map<number, SosRequest>;
  private chatMessages: Map<number, ChatMessage>;
  private currentUserId: number;
  private currentNgoId: number;
  private currentSosId: number;
  private currentMessageId: number;
  sessionStore: Store;

  constructor() {
    this.users = new Map();
    this.ngos = new Map();
    this.sosRequests = new Map();
    this.chatMessages = new Map();
    this.currentUserId = 1;
    this.currentNgoId = 1;
    this.currentSosId = 1;
    this.currentMessageId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
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
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id, 
      location: insertUser.location ?? null,
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  async getNgo(id: number): Promise<Ngo | undefined> {
    return this.ngos.get(id);
  }

  async getNgoByUserId(userId: number): Promise<Ngo | undefined> {
    return Array.from(this.ngos.values()).find(ngo => ngo.userId === userId);
  }

  async createNgo(insertNgo: InsertNgo): Promise<Ngo> {
    const id = this.currentNgoId++;
    const ngo: Ngo = { 
      ...insertNgo, 
      id,
      coverageArea: insertNgo.coverageArea ?? null,
      points: insertNgo.points ?? null,
      totalRescues: insertNgo.totalRescues ?? null,
      successRate: insertNgo.successRate ?? null,
    };
    this.ngos.set(id, ngo);
    return ngo;
  }

  async getAllNgos(): Promise<Ngo[]> {
    return Array.from(this.ngos.values()).sort((a, b) => (b.points || 0) - (a.points || 0));
  }

  async updateNgoPoints(ngoId: number, points: number): Promise<void> {
    const ngo = this.ngos.get(ngoId);
    if (ngo) {
      ngo.points = (ngo.points || 0) + points;
      ngo.totalRescues = (ngo.totalRescues || 0) + 1;
      this.ngos.set(ngoId, ngo);
    }
  }

  async getSosRequest(id: number): Promise<SosRequest | undefined> {
    return this.sosRequests.get(id);
  }

  async createSosRequest(insertRequest: InsertSosRequest): Promise<SosRequest> {
    const id = this.currentSosId++;
    const request: SosRequest = { 
      ...insertRequest, 
      id, 
      status: "pending",
      description: insertRequest.description ?? null,
      assignedNgoId: null,
      createdAt: new Date() 
    };
    this.sosRequests.set(id, request);
    return request;
  }

  async getSosRequestsByStatus(status: string): Promise<SosRequest[]> {
    return Array.from(this.sosRequests.values())
      .filter(request => request.status === status)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getUserSosRequests(userId: number): Promise<SosRequest[]> {
    return Array.from(this.sosRequests.values())
      .filter(request => request.userId === userId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async updateSosRequest(id: number, updates: Partial<SosRequest>): Promise<SosRequest | undefined> {
    const request = this.sosRequests.get(id);
    if (request) {
      const updatedRequest = { ...request, ...updates };
      this.sosRequests.set(id, updatedRequest);
      return updatedRequest;
    }
    return undefined;
  }

  async getChatMessages(sosRequestId: number): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values())
      .filter(message => message.sosRequestId === sosRequestId)
      .sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = this.currentMessageId++;
    const message: ChatMessage = { 
      ...insertMessage, 
      id, 
      messageType: insertMessage.messageType ?? null,
      createdAt: new Date() 
    };
    this.chatMessages.set(id, message);
    return message;
  }
}

export const storage = new MemStorage();
