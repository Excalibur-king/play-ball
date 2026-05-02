let nextId = 1

export function resetEntityIds() {
  nextId = 1
}

// Stable string IDs let renderers diff view objects without holding references
// to simulation entities across frames.
export function createEntityId(prefix: string) {
  return `${prefix}-${nextId++}`
}
