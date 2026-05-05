
export const removeAccents = (str: string): string => {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]/g, '');
};

export const generateUniqueKey = (name: string, phone: string): string => {
  const cleanName = removeAccents(name);
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  return `${cleanName}${cleanPhone}`;
};
