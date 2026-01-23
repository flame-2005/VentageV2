export const capitalize = (str = "") =>
  str
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase());