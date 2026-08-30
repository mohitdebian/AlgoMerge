// Role-based authorization checks
import { Request, Response, NextFunction } from 'express';

type Role = 'admin' | 'editor' | 'viewer';

interface AuthUser {
  userId: string;
  role: Role;
}

// Role hierarchy: admin > editor > viewer
const roleHierarchy: Record<Role, number> = { admin: 3, editor: 2, viewer: 1 };

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as AuthUser | undefined;

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions', requiredRoles: allowedRoles });
    }

    next();
  };
}

// Usage: app.delete('/api/users/:id', requireRole('admin'), deleteUserHandler);
// Usage: app.put('/api/posts/:id', requireRole('admin', 'editor'), updatePostHandler);
