import YAML from "yaml";

// Re-export parse to keep imports clean and allow swapping implementation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parse(content: string): any {
  return YAML.parse(content);
}
