
export const calculateKPI = (q: number, c: number, d: number) => {
  const avg = (q + c + d) / 3;
  let percentage = 0;
  
  if (avg >= 4.5) percentage = 120;
  else if (avg >= 4.0) percentage = 110;
  else if (avg >= 3.0) percentage = 100;
  else if (avg >= 2.0) percentage = 80;
  else percentage = 50;

  const isPass = percentage >= 100;
  const label = isPass ? 'ĐẠT KPI' : 'KHÔNG ĐẠT KPI';
  const colorClass = isPass ? 'text-green-600' : 'text-red-600';

  return { avg, percentage, isPass, label, colorClass };
};
