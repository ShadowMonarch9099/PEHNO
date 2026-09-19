/** Mirror of the API's Indian mobile validation, for instant client-side feedback. */
export const digitsOnly = (s: string) => s.replace(/\D/g, '');

export const isValidIndianMobile = (s: string) => /^[6-9]\d{9}$/.test(digitsOnly(s));

export const formatIndianMobile = (s: string) => {
  const d = digitsOnly(s).slice(0, 10);
  return d.length > 5 ? `${d.slice(0, 5)} ${d.slice(5)}` : d;
};
