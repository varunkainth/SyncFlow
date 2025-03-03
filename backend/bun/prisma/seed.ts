import { PrismaClient } from "@prisma/client";
import { ROLES, ALL_PERMISSIONS, ROLE_PERMISSIONS } from "../src/constants/permissions.constants";
import chalk from "chalk"; // For colored console output

const prisma = new PrismaClient();

async function main() {
  console.log(chalk.blue("🚀 Starting seeding..."));

  try {
    // Validate input data before processing
    validateSeedData();
    
    // Insert roles with enhanced error handling
    const roleResults = await prisma.role.createMany({
      data: ROLES.map((role) => ({ name: role })),
      skipDuplicates: true,
    });
    
    console.log(chalk.green(`✅ Inserted/verified ${roleResults.count} roles`));

    // Insert permissions with enhanced error handling
    const permissionResults = await prisma.permission.createMany({
      data: ALL_PERMISSIONS.map((permission) => ({ name: permission })),
      skipDuplicates: true,
    });
    
    console.log(chalk.green(`✅ Inserted/verified ${permissionResults.count} permissions`));

    // Assign permissions to roles with transaction support
    console.log(chalk.blue("🔄 Assigning permissions to roles..."));

    await processRolePermissions();

    console.log(chalk.green("🎉 Seeding completed successfully!"));
  } catch (error) {
    console.error(chalk.red("❌ Seeding failed:"), error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Validate seed data before processing
function validateSeedData() {
  // Check if ROLES and ALL_PERMISSIONS arrays are not empty
  if (!ROLES.length) {
    throw new Error("ROLES array cannot be empty");
  }
  
  if (!ALL_PERMISSIONS.length) {
    throw new Error("ALL_PERMISSIONS array cannot be empty");
  }
  
  // Check for role-permission mapping consistency
  for (const role of ROLES) {
    if (!(role in ROLE_PERMISSIONS)) {
      throw new Error(`Role ${role} exists in ROLES but has no permissions defined in ROLE_PERMISSIONS`);
    }
  }
  
  for (const roleName in ROLE_PERMISSIONS) {
    if (!ROLES.includes(roleName as any)) {
      throw new Error(`Role ${roleName} in ROLE_PERMISSIONS is not defined in ROLES array`);
    }
    
    const permissionList = ROLE_PERMISSIONS[roleName as keyof typeof ROLE_PERMISSIONS];
    for (const permission of permissionList) {
      if (!ALL_PERMISSIONS.includes(permission as any)) {
        throw new Error(`Permission '${permission}' assigned to role '${roleName}' is not defined in ALL_PERMISSIONS`);
      }
    }
  }
  
  console.log(chalk.green("✅ Seed data validation passed"));
}

// Process role-permission mappings with transaction support
async function processRolePermissions() {
  let roleCount = 0;
  let permissionCount = 0;
  let errorCount = 0;
  
  // Get all roles and permissions at once to minimize DB queries
  const allRoles = await prisma.role.findMany();
  const allPermissions = await prisma.permission.findMany();
  
  // Create lookup maps for faster access
  const roleMap = new Map(allRoles.map(role => [role.name, role]));
  const permissionMap = new Map(allPermissions.map(perm => [perm.name, perm]));
  
  for (const [roleName, permissionList] of Object.entries(ROLE_PERMISSIONS)) {
    try {
      // Get role from our map
      const role = roleMap.get(roleName);
      
      if (!role) {
        console.error(chalk.red(`❌ Role ${roleName} not found in database`));
        errorCount++;
        continue;
      }
      
      // Filter out permissions that exist in our map
      const validPermissions = permissionList
        .map(permName => permissionMap.get(permName))
        .filter(Boolean);
      
      const permissionIds = validPermissions.map(permm => permm!.id);
      
      // Log any missing permissions
      const missingPermissions = permissionList.filter(
        permName => !permissionMap.has(permName)
      );
      
      if (missingPermissions.length > 0) {
        console.warn(
          chalk.yellow(`⚠️ Missing permissions for ${roleName}:`), 
          missingPermissions
        );
      }
      
      if (permissionIds.length > 0) {
        // Use transaction for this role's permission assignments
        await prisma.$transaction(async (tx) => {
          // First, remove any existing assignments for this role (clean slate approach)
          await tx.rolePermission.deleteMany({
            where: { roleId: role.id }
          });
          
          // Then create the new assignments
          await tx.rolePermission.createMany({
            data: permissionIds.map(permId => ({
              roleId: role.id,
              permissionId: permId,
            })),
          });
        });
        
        console.log(chalk.green(`✅ Assigned ${permissionIds.length} permissions to ${roleName}`));
        roleCount++;
        permissionCount += permissionIds.length;
      }
    } catch (error) {
      console.error(chalk.red(`❌ Error processing role ${roleName}:`), error);
      errorCount++;
    }
  }
  
  console.log(
    chalk.blue(`📊 Summary: Processed ${roleCount} roles, assigned ${permissionCount} permissions, encountered ${errorCount} errors`)
  );
}

main()
  .catch((e) => {
    console.error(chalk.red("❌ Seeding failed:"), e);
    process.exit(1);
  });