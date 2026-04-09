const DEFAULT_YEAR_BASE = 2025;

export function getDynamicYearOptions(
  candidateYears: Array<number | string | undefined>,
  referenceDate = new Date(),
  baseYear = DEFAULT_YEAR_BASE
): string[] {
  const currentYear = referenceDate.getFullYear();
  const years = new Set<number>();

  for (let year = baseYear; year <= currentYear; year += 1) {
    years.add(year);
  }

  candidateYears.forEach((value) => {
    if (value === undefined || value === null || value === '') return;
    const parsedYear =
      typeof value === 'number'
        ? value
        : Number.parseInt(String(value), 10);

    if (!Number.isNaN(parsedYear)) {
      years.add(parsedYear);
    }
  });

  return Array.from(years)
    .sort((a, b) => a - b)
    .map((year) => String(year));
}

