export function toDateKey(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().split("T")[0];
}

export function groupItemsByDate(items = [], getDate = (item) => item?.date) {
  return items.reduce((acc, item) => {
    const source = typeof getDate === "function" ? getDate(item) : item?.date;
    const key = toDateKey(source);
    if (!key) return acc;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}
