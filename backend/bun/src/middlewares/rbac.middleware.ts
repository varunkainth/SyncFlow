import { Request, Response, NextFunction } from "express";
import { ROLE_PERMISSIONS, Permission, Role } from "../constants/permissions.constants";
import { User } from "../types/auth.types"; // Import User type

/**
 * Authorization middleware for role-based and permission-based access control.
 *
 * @param requiredRolesOrPermissions - Required roles or permissions
 * @param options - { requireAll?: boolean; checkPermissions?: boolean }
 */
export function authorize(
  requiredRolesOrPermissions: (Role | Permission)[],
  options: { requireAll?: boolean; checkPermissions?: boolean } = {}
) {
  const { requireAll = false, checkPermissions = false } = options;

  return function (req: Request, res: Response, next: NextFunction) {
    try {
      const user: User | undefined = req.user;

      if (!user) {
        console.warn("[RBAC] Unauthorized access attempt.");
        return res.status(401).json({ error: "Unauthorized: User not authenticated" });
      }

      console.log(`[RBAC] Checking access for user: ${user.email}, Roles: ${user.roles?.join(", ") || "None"}`);

      // Ensure user.roles is an array
      if (!Array.isArray(user.roles)) {
        return res.status(500).json({ error: "Invalid user role format." });
      }

      // Aggregate user's permissions from roles + explicit permissions
      const userPermissions = new Set([
        ...user.roles.flatMap(role => ROLE_PERMISSIONS[role] || []),
        ...(user.permissions || [])
      ]);

      let hasAccess = false;
      const missing: string[] = [];

      if (checkPermissions) {
        // Checking permissions
        hasAccess = requireAll
          ? requiredRolesOrPermissions.every(perm => {
              const allowed = userPermissions.has(perm as Permission);
              if (!allowed) missing.push(perm as Permission);
              return allowed;
            })
          : requiredRolesOrPermissions.some(perm => userPermissions.has(perm as Permission));
      } else {
        // Checking roles
        hasAccess = requireAll
          ? requiredRolesOrPermissions.every(role => {
              const allowed = user.roles.includes(role as Role);
              if (!allowed) missing.push(role as string);
              return allowed;
            })
          : user.roles.some(role => requiredRolesOrPermissions.includes(role));
      }

      if (!hasAccess) {
        console.warn(
          `[RBAC] Access denied for ${user.email}. Required: [${requiredRolesOrPermissions.join(", ")}], Missing: [${missing.join(", ")}]`
        );
        return res.status(403).json({ error: "Forbidden: Access denied", missing });
      }

      next();
    } catch (error) {
      console.error("[RBAC] Middleware error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  };
}
