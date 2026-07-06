import { describe, it, expect } from 'vitest'
import { resolveFunctionErrorMessage } from './errors'

describe('resolveFunctionErrorMessage', () => {
  it('returns fallback when error is null', async () => {
    const result = await resolveFunctionErrorMessage(null, 'fallback msg')
    expect(result).toBe('fallback msg')
  })

  it('returns fallback when error is not an object', async () => {
    const result = await resolveFunctionErrorMessage('string error', 'fallback msg')
    expect(result).toBe('fallback msg')
  })

  it('extracts error from context.json()', async () => {
    const error = {
      context: {
        json: async () => ({ error: 'A user with this email address has already been registered' }),
      },
    }
    const result = await resolveFunctionErrorMessage(error, 'fallback')
    expect(result).toBe('A user with this email address has already been registered')
  })

  it('extracts message from context.json() when no error field', async () => {
    const error = {
      context: {
        json: async () => ({ message: 'Some message' }),
      },
    }
    const result = await resolveFunctionErrorMessage(error, 'fallback')
    expect(result).toBe('Some message')
  })

  it('falls back to context.text() when json() fails', async () => {
    const error = {
      context: {
        json: async () => { throw new Error('body consumed') },
        text: async () => '{"error":"duplicate email"}',
      },
    }
    const result = await resolveFunctionErrorMessage(error, 'fallback')
    expect(result).toBe('duplicate email')
  })

  it('parses plain text from context.text() when not JSON', async () => {
    const error = {
      context: {
        text: async () => 'Plain error message',
      },
    }
    const result = await resolveFunctionErrorMessage(error, 'fallback')
    expect(result).toBe('Plain error message')
  })

  it('extracts error from error.message when it is valid JSON', async () => {
    const error = {
      message: '{"error":"duplicate email from message"}',
      context: {},
    }
    const result = await resolveFunctionErrorMessage(error, 'fallback')
    expect(result).toBe('duplicate email from message')
  })

  it('returns error.message directly when not JSON and not generic', async () => {
    const error = {
      message: 'Something went wrong',
    }
    const result = await resolveFunctionErrorMessage(error, 'fallback')
    expect(result).toBe('Something went wrong')
  })

  it('returns fallback for generic FunctionsHttpError message', async () => {
    const error = {
      message: 'Failed to send a request to the Edge Function',
      context: {},
    }
    const result = await resolveFunctionErrorMessage(error, 'fallback')
    expect(result).toBe('fallback')
  })

  it('returns fallback when context.json() returns empty', async () => {
    const error = {
      context: {
        json: async () => ({}),
        text: async () => '',
      },
    }
    const result = await resolveFunctionErrorMessage(error, 'fallback')
    expect(result).toBe('fallback')
  })
})
