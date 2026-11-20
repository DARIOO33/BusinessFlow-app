// Roles, shared by the server (src/lib/tenant.ts) and the browser.

export const ROLES = ["MEMBER", "ADMIN", "OWNER"] as const;
export type Role = (typeof ROLES)[number];

const RANK: Record<Role, number> = { MEMBER: 1, ADMIN: 2, OWNER: 3 };

export function hasRole(role: Role, minRole: Role) {
  return RANK[role] >= RANK[minRole];
}

// "OWNER" -> "Owner"
export function roleLabel(role: Role) {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

export const ROLE_INFO: Record<Role, string> = {
  MEMBER: "Sees the company and the team. Can leave at any time.",
  ADMIN: "Edits the company profile, invites Members and Admins, removes Members.",
  OWNER: "Everything: changes roles, removes anyone, deletes the company. There's always at least one.",
};
