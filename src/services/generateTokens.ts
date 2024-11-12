import jwt from "jsonwebtoken";

export const generateToken = ({
  id,
  phoneNumber,
}: {
  id: number;
  phoneNumber: string;
}): string => {
  return jwt.sign({
    id: id,
    phoneNumber: phoneNumber,
  },process.env.JWT_SECRET || "", {
    expiresIn: "7d",
  });
};

export const verifyToken = (
  token: string
): {
  id: number;
  phoneNumber: string;
} | null => {
  const user = jwt.verify(token, process.env.JWT_SECRET || "");
  return (user as { id: number;phoneNumber:string}) || null;
};