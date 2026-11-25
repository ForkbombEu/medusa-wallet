import { describe, expect, it } from 'vitest'
import { banner } from '../src/banner.js'
import { createProgram } from '../src/index.js'

function helpOutput(): string {
  let out = ''
  createProgram()
    .configureOutput({ writeOut: (text) => (out += text) })
    .outputHelp()
  return out
}

describe('createProgram', () => {
  it('reports cli and core versions', () => {
    expect(createProgram().version()).toMatch(/^\d+\.\d+\.\d+ \(core \d+\.\d+\.\d+\)$/)
  })

  it('prints the ASCII-art header before the help text', () => {
    const help = helpOutput()
    expect(help.startsWith(banner)).toBe(true)
    expect(help).toContain('Usage: medusa-wallet')
  })
})
