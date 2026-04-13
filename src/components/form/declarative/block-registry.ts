import type { BlockComponent } from "./types";

const registry = new Map<string, BlockComponent>();

export function registerFormBlock(id: string, component: BlockComponent): void {
  registry.set(id, component);
}

export function getFormBlock(id: string): BlockComponent | undefined {
  return registry.get(id);
}

export function getRegisteredBlockIds(): string[] {
  return Array.from(registry.keys());
}
