export function localDate(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

export function validateRequestItems(items) {
  const errors = [];
  items.forEach((item, index) => {
    const prefix = `Requirement ${index + 1}: `;
    if (!item.subcategory?.trim()) errors.push(prefix + 'choose a role.');
    if (!Number.isInteger(Number(item.count)) || Number(item.count) < 1 || Number(item.count) > 100) errors.push(prefix + 'enter 1–100 people.');
    const date = new Date(`${item.date}T12:00:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date || '') || Number.isNaN(date.getTime()) || localDate(date) !== item.date) errors.push(prefix + 'enter a valid date as YYYY-MM-DD.');
    else if (item.date < localDate()) errors.push(prefix + 'choose today or a future date.');
    const time = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!time.test(item.startTime || '') || !time.test(item.endTime || '')) errors.push(prefix + 'enter start and end times as HH:MM.');
    else if (item.startTime === item.endTime) errors.push(prefix + 'start and end times must be different.');
    if (!item.location?.trim()) errors.push(prefix + 'add a location.');
    if (item.budgetPerDay != null && item.budgetPerDay !== '' && (!Number.isFinite(Number(item.budgetPerDay)) || Number(item.budgetPerDay) <= 0)) errors.push(prefix + 'enter a positive budget or leave it blank.');
  });
  return errors;
}
