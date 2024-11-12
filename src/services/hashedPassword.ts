import bcryptjs from "bcryptjs";

export const hashPin = (pin: string): string => {
  const salt = bcryptjs.genSaltSync(10);
  return bcryptjs.hashSync(pin, salt);
};

export const comparePin = (
  pin: string,
  hashedPin: string
): boolean => {
  return bcryptjs.compareSync(pin, hashedPin);
};