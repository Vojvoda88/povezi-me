
export const generateCaptchaCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let res = "";
  for(let i=0; i<6; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
};

export const verifyCaptcha = (input: string, code: string): boolean => {
  return input.toUpperCase() === code.toUpperCase();
};
