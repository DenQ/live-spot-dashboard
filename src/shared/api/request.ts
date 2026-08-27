import { env } from '@shared/config'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
}

function joinUrl(base: string, path: string): string {
  if (!base) {
    return path
  }

  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

export async function requestJson<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options

  const response = await fetch(url, {
    ...rest,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!response.ok) {
    throw new ApiError(response.status, `Request failed: ${response.status} ${response.statusText}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return requestJson<T>(joinUrl(env.apiBaseUrl, path), options)
}
