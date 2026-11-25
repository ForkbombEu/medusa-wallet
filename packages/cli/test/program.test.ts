import { describe, expect, it } from 'vitest'
import { createProgram } from '../src/index.js'

describe('createProgram', () => {
  it('reports cli and core versions', () => {
    expect(createProgram().version()).toMatch(/^\d+\.\d+\.\d+ \(core \d+\.\d+\.\d+\)$/)
  })
})
