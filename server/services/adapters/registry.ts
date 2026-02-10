import type { AIToolAdapter, AdapterInfo } from './types.js';

class AdapterRegistry {
  private adapters = new Map<string, AIToolAdapter>();

  register(adapter: AIToolAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  get(id: string): AIToolAdapter | undefined {
    return this.adapters.get(id);
  }

  getAll(): AIToolAdapter[] {
    return Array.from(this.adapters.values());
  }

  async getAvailable(): Promise<AIToolAdapter[]> {
    const results = await Promise.all(
      this.getAll().map(async (a) => ({
        adapter: a,
        available: await a.isAvailable(),
      })),
    );
    return results.filter((r) => r.available).map((r) => r.adapter);
  }

  async listAll(): Promise<AdapterInfo[]> {
    return Promise.all(
      this.getAll().map(async (a) => {
        const available = await a.isAvailable();
        let sessionCount: number | undefined;
        if (available) {
          try {
            const stats = await a.getStats();
            sessionCount = stats.totalSessions;
          } catch {
            // stats unavailable
          }
        }
        return {
          id: a.id,
          name: a.name,
          icon: a.icon,
          category: a.category,
          description: a.description,
          available,
          sessionCount,
        };
      }),
    );
  }
}

export const registry = new AdapterRegistry();
