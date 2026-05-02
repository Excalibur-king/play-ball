import { describe, expect, it } from 'vitest'
import { validateCurrentContent } from './contentValidation'

describe('runtime content validation', () => {
  it('accepts the current game content', () => {
    expect(validateCurrentContent()).toEqual([])
  })
})
