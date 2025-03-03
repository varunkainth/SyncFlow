// utils/permission.utils.ts
import { PrismaClient } from "@prisma/client";
import { AuthorizedRequest } from "../types/permission.types.ts";
import { NextFunction, Response } from "express";

export const prisma = new PrismaClient();

/**
 * Checks if a user has a specific permission
 */
export async function hasPermission(
  userId: string,
  permissionName: string
): Promise<boolean> {
  // Count the number of matching permissions through user roles
  const count = await prisma.user.count({
    where: {
      id: userId,
      roles: {
        some: {
          role: {
            permissions: {
              some: {
                permission: {
                  name: permissionName,
                },
              },
            },
          },
        },
      },
    },
  });

  return count > 0;
}

/**
 * Gets all permissions for a user
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  const userWithRoles = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!userWithRoles) {
    return [];
  }

  // Extract unique permission names
  const permissions = new Set<string>();
  
  userWithRoles.roles.forEach((userRole) => {
    userRole.role.permissions.forEach((rolePermission) => {
      permissions.add(rolePermission.permission.name);
    });
  });

  return Array.from(permissions);
}

/**
 * Assigns a role to a user
 */
export async function assignRoleToUser(
  userId: string,
  roleName: string,
  assignedBy?: string
): Promise<boolean> {
  try {
    // Find the role
    const role = await prisma.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      return false;
    }

    // Create the user-role relationship
    await prisma.userRole.create({
      data: {
        userId,
        roleId: role.id,
        assignedBy,
      },
    });

    return true;
  } catch (error) {
    console.error("Error assigning role:", error);
    return false;
  }
}

/**
 * Middleware for Express.js to check permissions
 */
export function requirePermission(permissionName: string) {
  return async (req: AuthorizedRequest, res: Response, next: NextFunction) => {
    // Ensuring req.user contains the authenticated user
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const hasAccess = await hasPermission(req.user.id, permissionName);
    
    if (!hasAccess) {
      return res.status(403).json({ 
        error: "Forbidden", 
        message: `Missing required permission: ${permissionName}` 
      });
    }

    next();
  };
}