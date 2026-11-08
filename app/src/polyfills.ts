import { Buffer } from 'buffer'

const globalObject = globalThis as typeof globalThis & {
  Buffer: typeof Buffer
}

globalObject.Buffer = Buffer
