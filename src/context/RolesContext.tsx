"use client";

import { createContext, useContext } from "react";
import type { RoleName, Permission } from "@/types/roles";
import { getPermissions } from "@/types/roles";

interface RolesContextValue {
  roles: RoleName[];
  hasRole: (role: RoleName) => boolean;
  hasAnyRole: (roles: RoleName[]) => boolean;
  hasPermission: (permission: Permission) => boolean;
}

const RolesContext = createContext<RolesContextValue>({
  roles: [],
  hasRole: () => false,
  hasAnyRole: () => false,
  hasPermission: () => false,
});

export function RolesProvider({
  children,
  initialRoles,
}: {
  children: React.ReactNode;
  initialRoles: RoleName[];
}) {
  const permissions = getPermissions(initialRoles);

  const value: RolesContextValue = {
    roles: initialRoles,
    hasRole: (role) => initialRoles.includes(role),
    hasAnyRole: (roles) => roles.some((r) => initialRoles.includes(r)),
    hasPermission: (permission) => permissions.has(permission),
  };

  return (
    <RolesContext.Provider value={value}>{children}</RolesContext.Provider>
  );
}

/** Returns the current user's roles and permission helpers. */
export function useRoles() {
  return useContext(RolesContext);
}
