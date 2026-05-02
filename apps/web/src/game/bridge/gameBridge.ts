import type { GameCommand, HudSnapshot } from '@tower-rogue/game-core'

type Listener<T> = (payload: T) => void

// Small in-memory bridge between React and Phaser.
// React emits player intent as GameCommand, Phaser owns the GameEngine instance,
// then publishes HudSnapshot back to React. Keeping this file tiny is deliberate:
// business rules belong in game-core, and rendering objects belong in Phaser.
class GameBridge {
  private commandListeners = new Set<Listener<GameCommand>>()
  private snapshotListeners = new Set<Listener<HudSnapshot>>()

  dispatch(command: GameCommand) {
    for (const listener of this.commandListeners) {
      listener(command)
    }
  }

  onCommand(listener: Listener<GameCommand>) {
    this.commandListeners.add(listener)
    return () => this.commandListeners.delete(listener)
  }

  publishSnapshot(snapshot: HudSnapshot) {
    for (const listener of this.snapshotListeners) {
      listener(snapshot)
    }
  }

  subscribeSnapshot(listener: Listener<HudSnapshot>) {
    this.snapshotListeners.add(listener)
    return () => this.snapshotListeners.delete(listener)
  }
}

export const gameBridge = new GameBridge()
