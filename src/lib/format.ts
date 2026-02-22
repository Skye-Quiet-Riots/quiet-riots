export function formatPence(pence: number): string {
  if (pence >= 100) {
    const pounds = (pence / 100).toFixed(pence % 100 === 0 ? 0 : 2);
    return `£${pounds}`;
  }
  return `${pence}p`;
}
