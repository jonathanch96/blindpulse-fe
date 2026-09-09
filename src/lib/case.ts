type JsonValue = null | string | number | boolean | JsonValue[] | { [key: string]: JsonValue }

function camelKey(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, character: string) => character.toUpperCase())
}

function snakeKey(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase()
}

function convert(value: JsonValue, keyMapper: (key: string) => string): JsonValue {
  if (Array.isArray(value)) {
    return value.map((item) => convert(item, keyMapper))
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [keyMapper(key), convert(item, keyMapper)]),
    )
  }
  return value
}

export function camelize<T>(value: T): T {
  return convert(value as JsonValue, camelKey) as T
}

export function decamelize<T>(value: T): T {
  return convert(value as JsonValue, snakeKey) as T
}

