/**
 * Nationality options for KYC identity verification.
 * Values are English country/region names stored as profile nationality/country.
 */
export const NATIONALITY_OPTIONS = [
  'Argentina',
  'Australia',
  'Austria',
  'Bangladesh',
  'Belgium',
  'Brazil',
  'Cambodia',
  'Canada',
  'Chile',
  'China',
  'Colombia',
  'Denmark',
  'Egypt',
  'Finland',
  'France',
  'Germany',
  'Greece',
  'Hong Kong',
  'Hungary',
  'India',
  'Indonesia',
  'Iran',
  'Ireland',
  'Israel',
  'Italy',
  'Japan',
  'Kenya',
  'Laos',
  'Luxembourg',
  'Macau',
  'Malaysia',
  'Maldives',
  'Mexico',
  'Morocco',
  'Myanmar',
  'Nepal',
  'Netherlands',
  'New Zealand',
  'Nigeria',
  'Norway',
  'Pakistan',
  'Peru',
  'Philippines',
  'Poland',
  'Portugal',
  'Qatar',
  'Russia',
  'Saudi Arabia',
  'Singapore',
  'South Africa',
  'South Korea',
  'Spain',
  'Sri Lanka',
  'Sweden',
  'Switzerland',
  'Taiwan',
  'Thailand',
  'Turkey',
  'Ukraine',
  'United Arab Emirates',
  'United Kingdom',
  'United States',
  'Vietnam',
] as const;

export type NationalityOption = (typeof NATIONALITY_OPTIONS)[number];

/** Options for a select; keeps an unknown saved value selectable. */
export function nationalityOptions(currentValue?: string | null): string[] {
  const value = String(currentValue || '').trim();
  if (!value || (NATIONALITY_OPTIONS as readonly string[]).includes(value)) {
    return [...NATIONALITY_OPTIONS];
  }
  return [value, ...NATIONALITY_OPTIONS];
}
