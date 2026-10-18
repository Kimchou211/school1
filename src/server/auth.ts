import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { dbManager } from './db.ts';
import { UserRole, TeacherStatus } from '../types/index.ts';

const JWT_SECRET = process.env.AUTH_SECRET || 'reading-assessment-khmer-secret-key-2026';

export interface AuthenticatedRequest extends Request {
  teacher?: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    status: TeacherStatus;
  };
}

export function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, 10);
}

export function comparePassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

export function generateToken(payload: { id: string; email: string; name: string; role?: UserRole; status?: TeacherStatus }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'សូមចូលប្រើប្រាស់គណនីរបស់អ្នកជាមុនសិន' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; name: string };
    const teacher = await dbManager.findTeacherById(decoded.id);
    if (!teacher) {
      res.status(401).json({ error: 'គណនីគ្រូមិនត្រូវបានរកឃើញ' });
      return;
    }

    req.teacher = {
      id: teacher.id,
      email: teacher.email,
      name: teacher.name,
      role: teacher.role,
      status: teacher.status,
    };
    next();
  } catch {
    res.status(401).json({ error: 'សម័យការចូលប្រើប្រាស់បានផុតកំណត់ សូមចូលម្ដងទៀត' });
  }
}

/**
 * Middleware: Requires the user to have approved status (or be an admin)
 * Pending, rejected, and suspended teachers cannot access academic resources.
 */
export async function requireApprovedTeacher(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.teacher) {
    res.status(401).json({ error: 'សូមចូលប្រើប្រាស់គណនីរបស់អ្នកជាមុនសិន' });
    return;
  }

  // Admins always have access
  if (req.teacher.role === 'admin') {
    next();
    return;
  }

  // Check status
  if (req.teacher.status !== 'approved') {
    let msg = 'គណនីរបស់អ្នកមិនទាន់ត្រូវបានអនុម័តទេ';
    if (req.teacher.status === 'pending') {
      msg = 'គណនីរបស់អ្នកកំពុងរង់ចាំការអនុម័តពីអ្នកគ្រប់គ្រង (Admin)';
    } else if (req.teacher.status === 'rejected') {
      msg = 'គណនីរបស់អ្នកត្រូវបានបដិសេធដោយអ្នកគ្រប់គ្រង';
    } else if (req.teacher.status === 'suspended') {
      msg = 'គណនីរបស់អ្នកត្រូវបានផ្អាកជាបណ្ដោះអាសន្ន';
    }
    res.status(403).json({ error: msg, status: req.teacher.status });
    return;
  }

  next();
}

/**
 * Middleware: Requires the user to be an admin
 */
export async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.teacher) {
    res.status(401).json({ error: 'សូមចូលប្រើប្រាស់គណនីរបស់អ្នកជាមុនសិន' });
    return;
  }

  if (req.teacher.role !== 'admin') {
    res.status(403).json({ error: 'ទាមទារសិទ្ធិជាអ្នកគ្រប់គ្រងប្រព័ន្ធ (Admin)' });
    return;
  }

  next();
}
