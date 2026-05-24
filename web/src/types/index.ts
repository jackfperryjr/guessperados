export enum GameState {
  Playing = 'Playing',
  Paused = 'Paused',
}

export enum AbilityType {
  None = 'None',
  Fire = 'Fire',
  Electric = 'Electric',
  Ice = 'Ice',
}

export enum DamageType {
  Physical = 'Physical',
  Fire = 'Fire',
  Explosion = 'Explosion',
  Electric = 'Electric',
}

export interface PlayerConfig {
  id: number
  inputType: 'keyboard' | 'gamepad' | 'touch'
  keyboardIndex?: number
}
