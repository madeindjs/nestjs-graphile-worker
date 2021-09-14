export function uniq<T>(a: Array<T>): Array<T> {
  return Array.from(new Set(a));
}
