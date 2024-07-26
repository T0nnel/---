import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface CustomRequest extends Request {
  userId?: string;
}

export const verifyToken = (req: CustomRequest, res: Response, next: NextFunction) => {
  // Retrieve the token from the Authorization header
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    // Verify and decode the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };

    // Attach userId to the request object
    req.userId = decoded.userId;

    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Authorization header missing' });

  if (!token) return res.status(401).json({ message: 'Token missing' });

  jwt.verify(token, process.env.JWT_SECRET as string, (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });

    (req as any).userId = (decoded as any).id; // Set user ID from token
    next();
  });
};
