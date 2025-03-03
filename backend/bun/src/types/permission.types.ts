// types/permission.types.ts

/**
 * Represents a role in the system
 */
export type Role = {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
  };
  
  /**
   * Represents a permission in the system
   */
  export type Permission = {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
  };
  
  /**
   * Maps roles to their corresponding permissions
   */
  export type RolePermissionMap = {
    [role: string]: string[];
  };
  
  /**
   * Request with authorized user
   */
  export interface AuthorizedRequest extends Request {
    user?: {
      id: string;
      email: string;
      name?: string;
    };
  }