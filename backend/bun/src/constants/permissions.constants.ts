/**
 * All available role names in the system
 */
export const ROLES = ["Admin", "Manager", "Developer", "Viewer", "Guest"] as const;
export type Role = (typeof ROLES)[number];

/**
 * All available permissions in the system, categorized
 */
export const PERMISSIONS = {
  PROJECT: {
    CREATE: "create_project",
    EDIT: "edit_project",
    DELETE: "delete_project",
    VIEW: "view_project"
  },
  TASK: {
    CREATE: "create_task",
    EDIT: "edit_task",
    DELETE: "delete_task",
    ASSIGN: "assign_task",
    VIEW: "view_task"
  },
  USER: {
    CREATE: "create_user",
    EDIT: "edit_user",
    DELETE: "delete_user",
    ASSIGN_ROLES: "assign_roles",
    VIEW: "view_users"
  },
  ACCESS: {
    MANAGE_PERMISSIONS: "manage_permissions",
    INVITE_USERS: "invite_users",
    REMOVE_USERS: "remove_users",
    VIEW_ROLES: "view_roles"
  }
} as const;

// Create a flat array of all permission values
export const ALL_PERMISSIONS = [
  ...Object.values(PERMISSIONS.PROJECT),
  ...Object.values(PERMISSIONS.TASK),
  ...Object.values(PERMISSIONS.USER),
  ...Object.values(PERMISSIONS.ACCESS)
] as const;

// Create a type for all permission string values
export type Permission = (typeof ALL_PERMISSIONS)[number];

/**
 * Default permission mapping for each role
 */
export const ROLE_PERMISSIONS: Record<Role, ReadonlyArray<Permission>> = {
  Admin: ALL_PERMISSIONS,
  Manager: [
    // Project Management
    PERMISSIONS.PROJECT.CREATE,
    PERMISSIONS.PROJECT.EDIT,
    PERMISSIONS.PROJECT.VIEW,
    // Task Management
    PERMISSIONS.TASK.CREATE,
    PERMISSIONS.TASK.EDIT,
    PERMISSIONS.TASK.DELETE,
    PERMISSIONS.TASK.ASSIGN,
    PERMISSIONS.TASK.VIEW,
    // User Management
    PERMISSIONS.USER.VIEW,
    // Access Control
    PERMISSIONS.ACCESS.INVITE_USERS,
    PERMISSIONS.ACCESS.VIEW_ROLES
  ],
  Developer: [
    // Project Management
    PERMISSIONS.PROJECT.VIEW,
    // Task Management
    PERMISSIONS.TASK.CREATE,
    PERMISSIONS.TASK.EDIT,
    PERMISSIONS.TASK.VIEW,
    // User Management
    PERMISSIONS.USER.VIEW
  ],
  Viewer: [
    // Project Management
    PERMISSIONS.PROJECT.VIEW,
    // Task Management
    PERMISSIONS.TASK.VIEW,
    // User Management
    PERMISSIONS.USER.VIEW,
    // Access Control
    PERMISSIONS.ACCESS.VIEW_ROLES
  ],
  Guest: [
    // Project Management
    PERMISSIONS.PROJECT.VIEW,
    // Task Management
    PERMISSIONS.TASK.VIEW
  ]
};