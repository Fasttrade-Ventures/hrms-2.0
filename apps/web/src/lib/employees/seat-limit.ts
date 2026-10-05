export function seatLimitMessage(activeCount: number, licensedHeadcount: number | null): string | null {
  if (licensedHeadcount == null) return null;
  if (activeCount >= licensedHeadcount) {
    return `This organization is licensed for ${licensedHeadcount} active employees.`;
  }
  return null;
}
