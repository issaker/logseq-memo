export const getStringBetween = (string, from, to) =>
  string.substring(string.indexOf(from) + from.length, string.lastIndexOf(to));

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const getOrdinalSuffix = (day: number): string => {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

export const parseRoamDateString = (roamDateString: string): Date => {
  const cleaned = roamDateString.replace(/(\d+)(st|nd|rd|th)/, '$1');
  const parsed = new Date(cleaned);
  if (isNaN(parsed.getTime())) return parsed;
  return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
};

export const dateToRoamDateString = (jsDateObject) => {
  const month = MONTH_NAMES[jsDateObject.getMonth()];
  const day = jsDateObject.getDate();
  const year = jsDateObject.getFullYear();
  return `${month} ${day}${getOrdinalSuffix(day)}, ${year}`;
};

export const parseConfigString = (configString: string): [string, string] => {
  const parts = configString.split('::');
  const key = parts[0].trim();
  const value = parts.slice(1).join('::').trim();
  return [key, value];
};

export const pluralize = (value: number, singular: string, plural: string) => {
  if (value === 1) return singular;
  return plural;
};

export const isNumeric = (value: string): boolean => {
  return !isNaN(Number(value)) && value.trim() !== '';
};
