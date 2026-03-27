export type RoleName =
  | "system_admin"
  | "aml_officer"
  | "broker"
  | "senior_manager";

export interface Role {
  id: string;
  name: RoleName;
  description: string;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  assigned_at: string;
  assigned_by: string | null;
  roles: Role;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  tenant_id: string | null;
  is_active: boolean;
  created_at: string;
  user_roles?: UserRole[];
}

// Permissions are additive across all roles a user holds.
export const ROLE_PERMISSIONS = {
  system_admin: [
    "manage_users",
    "manage_roles",
    "system_configuration",
    "view_all_clients",
    "manage_clients",
    "view_documents",
    "manage_documents",
    "approve_escalated_clients",
    "decline_escalated_clients",
  ],
  aml_officer: [
    "view_all_clients",
    "modify_risk_levels",
    "assign_edd",
    "escalate_clients",
    "reassign_clients",
  ],
  broker: [
    "create_clients",
    "edit_own_clients",
    "send_verification_links",
  ],
  senior_manager: [
    "view_all_clients",
    "upload_policy_documents",
    "assign_training",
    "approve_escalated_clients",
    "decline_escalated_clients",
  ],
} as const satisfies Record<RoleName, readonly string[]>;

export type Permission =
  (typeof ROLE_PERMISSIONS)[RoleName][number];

export function getPermissions(roles: RoleName[]): Set<Permission> {
  const perms = new Set<Permission>();
  for (const role of roles) {
    for (const perm of ROLE_PERMISSIONS[role]) {
      perms.add(perm as Permission);
    }
  }
  return perms;
}
