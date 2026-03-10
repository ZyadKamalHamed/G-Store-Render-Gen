export function stripHeadings(text: string): string {
  return text
    .split('\n')
    .filter((line) => !line.startsWith('## '))
    .join('\n')
    .replace(/\n{2,}/g, '\n')
    .trim()
}
