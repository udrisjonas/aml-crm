"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Role, RoleName } from "@/types/roles";
import {
  inviteUserAction,
  generateInviteLinkAction,
  createUserDirectlyAction,
  assignRoleAction,
  removeRoleAction,
  setUserActiveAction,
  resendInviteEmailAction,
  resendInviteLinkAction,
  revokeInviteAction,
} from "@/app/actions/users";

// ── Types ─────────────────────────────────────────────────────────────────────

type InviteMode = "email" | "link" | "direct";

const ROLE_COLORS: Record<RoleName, string> = {
  system_admin:   "bg-purple-100 text-purple-700",
  aml_officer:    "bg-blue-100 text-blue-700",
  broker:         "bg-emerald-100 text-emerald-700",
  senior_manager: "bg-amber-100 text-amber-700",
};

const MODE_LABELS: Record<InviteMode, string> = {
  email:  "Send invite email",
  link:   "Copy invite link",
  direct: "Create user",
};

const MODE_SUBMIT_LABELS: Record<InviteMode, string> = {
  email:  "Send invite",
  link:   "Generate link",
  direct: "Create user",
};

interface UserRoleRow {
  id: string;
  assigned_at: string;
  roles: Role;
}

interface UserRow {
  id: string;
  full_name: string | null;
  email: string;
  tenant_id: string | null;
  is_active: boolean;
  created_at: string;
  user_roles?: UserRoleRow[];
}

interface PendingInvite {
  id: string;
  email: string;
  full_name: string;
  roles: string[];
  created_at: string;
  last_sent_at?: string | null;
}

interface Props {
  initialUsers: UserRow[];
  allRoles: Role[];
  initialPendingInvites: PendingInvite[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isInviteExpired(invite: PendingInvite) {
  const refTime = invite.last_sent_at ?? invite.created_at;
  return Date.now() - new Date(refTime).getTime() > 24 * 60 * 60 * 1000;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Initials({ name, email }: { name: string | null; email: string }) {
  return (
    <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
      <span className="text-slate-500 text-xs font-semibold">
        {(name ?? email)
          .split(/[ @]/)
          .slice(0, 2)
          .map((s) => s[0]?.toUpperCase() ?? "")
          .join("")}
      </span>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function UsersManager({
  initialUsers,
  allRoles,
  initialPendingInvites,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Active users
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [showArchived, setShowArchived] = useState(false);
  const [addingRoleFor, setAddingRoleFor] = useState<string | null>(null);
  const [tableError, setTableError] = useState("");

  // Add-user form
  const [inviteMode, setInviteMode] = useState<InviteMode | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFullName, setInviteFullName] = useState("");
  const [inviteRoles, setInviteRoles] = useState<RoleName[]>([]);
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  // Pending invites
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>(
    initialPendingInvites
  );
  const [pendingError, setPendingError] = useState("");
  const [pendingSuccess, setPendingSuccess] = useState("");
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Generated link modal (shared between add-user and pending invite actions)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // ── Form helpers ────────────────────────────────────────────────────────────

  function resetForm() {
    setInviteEmail("");
    setInviteFullName("");
    setInviteRoles([]);
    setInvitePassword("");
    setInviteError("");
    setInviteSuccess("");
  }

  function selectMode(mode: InviteMode) {
    if (inviteMode === mode) {
      setInviteMode(null);
      resetForm();
    } else {
      setInviteMode(mode);
      resetForm();
    }
  }

  // ── Add-user form submit ─────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setInviteError("");
    setInviteSuccess("");

    startTransition(async () => {
      try {
        if (inviteMode === "email") {
          await inviteUserAction(inviteEmail, inviteFullName, inviteRoles);
          setInviteSuccess(`Invite sent to ${inviteEmail}`);
          setInviteEmail("");
          setInviteFullName("");
          setInviteRoles([]);
          router.refresh();
        } else if (inviteMode === "link") {
          const link = await generateInviteLinkAction(
            inviteEmail,
            inviteFullName,
            inviteRoles
          );
          openLinkModal(link);
          router.refresh();
        } else if (inviteMode === "direct") {
          await createUserDirectlyAction(
            inviteEmail,
            inviteFullName,
            invitePassword,
            inviteRoles
          );
          setInviteSuccess(`User ${inviteEmail} created successfully`);
          setInviteEmail("");
          setInviteFullName("");
          setInviteRoles([]);
          setInvitePassword("");
          router.refresh();
        }
      } catch (err) {
        setInviteError(err instanceof Error ? err.message : "Action failed");
      }
    });
  }

  // ── Active user table actions ────────────────────────────────────────────────

  async function handleAssignRole(userId: string, roleId: string) {
    setTableError("");
    startTransition(async () => {
      try {
        await assignRoleAction(userId, roleId);
        const roleObj = allRoles.find((r) => r.id === roleId)!;
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? {
                  ...u,
                  user_roles: [
                    ...(u.user_roles ?? []),
                    {
                      id: crypto.randomUUID(),
                      assigned_at: new Date().toISOString(),
                      roles: roleObj,
                    } as UserRoleRow,
                  ],
                }
              : u
          )
        );
        setAddingRoleFor(null);
      } catch (err) {
        setTableError(
          err instanceof Error ? err.message : "Failed to assign role"
        );
      }
    });
  }

  async function handleRemoveRole(userId: string, userRoleId: string) {
    setTableError("");
    startTransition(async () => {
      try {
        await removeRoleAction(userRoleId);
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? {
                  ...u,
                  user_roles: u.user_roles?.filter((r) => r.id !== userRoleId),
                }
              : u
          )
        );
      } catch (err) {
        setTableError(
          err instanceof Error ? err.message : "Failed to remove role"
        );
      }
    });
  }

  async function handleToggleActive(userId: string, isActive: boolean) {
    setTableError("");
    startTransition(async () => {
      try {
        await setUserActiveAction(userId, !isActive);
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, is_active: !isActive } : u
          )
        );
      } catch (err) {
        setTableError(
          err instanceof Error ? err.message : "Failed to update user"
        );
      }
    });
  }

  // ── Pending invite actions ───────────────────────────────────────────────────

  function openLinkModal(link: string) {
    setGeneratedLink(link);
    setLinkCopied(false);
  }

  async function handleCopyLink() {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  async function handleResendEmail(inviteId: string) {
    setPendingError("");
    setPendingSuccess("");
    startTransition(async () => {
      try {
        await resendInviteEmailAction(inviteId);
        setPendingInvites((prev) =>
          prev.map((inv) =>
            inv.id === inviteId
              ? { ...inv, last_sent_at: new Date().toISOString() }
              : inv
          )
        );
        setPendingSuccess("Invite email resent.");
        setTimeout(() => setPendingSuccess(""), 4000);
      } catch (err) {
        setPendingError(
          err instanceof Error ? err.message : "Failed to resend invite"
        );
      }
    });
  }

  async function handleResendLink(inviteId: string) {
    setPendingError("");
    startTransition(async () => {
      try {
        const link = await resendInviteLinkAction(inviteId);
        setPendingInvites((prev) =>
          prev.map((inv) =>
            inv.id === inviteId
              ? { ...inv, last_sent_at: new Date().toISOString() }
              : inv
          )
        );
        openLinkModal(link);
      } catch (err) {
        setPendingError(
          err instanceof Error ? err.message : "Failed to generate link"
        );
      }
    });
  }

  async function handleRevokeConfirm(inviteId: string) {
    setPendingError("");
    startTransition(async () => {
      try {
        await revokeInviteAction(inviteId);
        setPendingInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
        setRevokingId(null);
      } catch (err) {
        setPendingError(
          err instanceof Error ? err.message : "Failed to revoke invite"
        );
        setRevokingId(null);
      }
    });
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">

      {/* Generated link modal */}
      {generatedLink && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800">
                Invite Link
              </h3>
              <button
                onClick={() => {
                  setGeneratedLink(null);
                  setLinkCopied(false);
                  // Only reset the add-user form if it was triggered from there
                  if (inviteMode === "link") {
                    resetForm();
                    setInviteMode(null);
                  }
                }}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-slate-500">
              Share this link with the user. It expires after 24 hours and can
              only be used once.
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={generatedLink}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs
                  text-slate-600 bg-slate-50 font-mono min-w-0"
              />
              <button
                onClick={handleCopyLink}
                className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  linkCopied
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {linkCopied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add User card ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-wrap gap-3">
          <h2 className="text-base font-semibold text-slate-800">Add User</h2>
          <div className="flex items-center gap-2">
            {(["email", "link", "direct"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => selectMode(mode)}
                className={`text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                  inviteMode === mode
                    ? "bg-blue-600 text-white border-blue-600"
                    : "text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-600 bg-white"
                }`}
              >
                {MODE_LABELS[mode]}
              </button>
            ))}
          </div>
        </div>

        {inviteMode && (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {inviteError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {inviteError}
              </p>
            )}
            {inviteSuccess && (
              <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                {inviteSuccess}
              </p>
            )}

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Full name
                </label>
                <input
                  type="text"
                  required
                  value={inviteFullName}
                  onChange={(e) => setInviteFullName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm
                    text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500
                    focus:border-transparent"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="jane@brokerage.com"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm
                    text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500
                    focus:border-transparent"
                />
              </div>
            </div>

            {inviteMode === "direct" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  placeholder="At least 8 characters"
                  minLength={8}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm
                    text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500
                    focus:border-transparent"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Roles
                <span className="ml-1 text-slate-400 font-normal">
                  (select one or more)
                </span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {allRoles.map((role) => {
                  const checked = inviteRoles.includes(role.name as RoleName);
                  return (
                    <label
                      key={role.id}
                      className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer
                        transition-colors ${
                          checked
                            ? "border-blue-400 bg-blue-50"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 accent-blue-600"
                        checked={checked}
                        onChange={(e) => {
                          const name = role.name as RoleName;
                          setInviteRoles((prev) =>
                            e.target.checked
                              ? [...prev, name]
                              : prev.filter((r) => r !== name)
                          );
                        }}
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-800 capitalize">
                          {role.name.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 leading-tight">
                          {role.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => {
                  setInviteMode(null);
                  resetForm();
                }}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
                  text-white text-sm font-medium rounded-lg transition"
              >
                {isPending ? "Processing…" : MODE_SUBMIT_LABELS[inviteMode]}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Users ─────────────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              {showArchived ? "Archived Users" : "Active Users"}
            </h2>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {users.filter((u) => showArchived ? !u.is_active : u.is_active).length}
            </span>
          </div>
          <button
            onClick={() => setShowArchived((v) => !v)}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
              showArchived
                ? "border-slate-400 bg-slate-100 text-slate-700"
                : "border-slate-300 text-slate-500 hover:bg-slate-50"
            }`}
          >
            {showArchived ? "← Active users" : "Archived"}
          </button>
        </div>

        {tableError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-3">
            {tableError}
          </p>
        )}

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3.5 font-medium text-slate-600">
                  User
                </th>
                <th className="text-left px-6 py-3.5 font-medium text-slate-600">
                  Roles
                </th>
                <th className="text-left px-6 py-3.5 font-medium text-slate-600">
                  Status
                </th>
                <th className="text-left px-6 py-3.5 font-medium text-slate-600">
                  Joined
                </th>
                <th className="px-6 py-3.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.filter((u) => showArchived ? !u.is_active : u.is_active).map((user) => {
                const userRoles = (user.user_roles ?? []) as UserRoleRow[];
                const assignedRoleIds = new Set(userRoles.map((r) => r.roles.id));
                const availableRoles = allRoles.filter(
                  (r) => !assignedRoleIds.has(r.id)
                );

                return (
                  <tr
                    key={user.id}
                    className={`align-top ${!user.is_active ? "opacity-50" : ""}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Initials name={user.full_name} email={user.email} />
                        <div>
                          <p className="font-medium text-slate-800">
                            {user.full_name || "—"}
                          </p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {userRoles.map((ur) => (
                          <span
                            key={ur.id}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                              text-xs font-medium ${
                                ROLE_COLORS[ur.roles.name as RoleName] ??
                                "bg-slate-100 text-slate-600"
                              }`}
                          >
                            {ur.roles.name.replace(/_/g, " ")}
                            <button
                              onClick={() =>
                                handleRemoveRole(user.id, ur.id)
                              }
                              disabled={isPending}
                              className="hover:opacity-70 transition-opacity ml-0.5"
                              title="Remove role"
                            >
                              ×
                            </button>
                          </span>
                        ))}

                        {addingRoleFor === user.id ? (
                          <select
                            autoFocus
                            className="text-xs border border-slate-300 rounded-lg px-2 py-1
                              bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value)
                                handleAssignRole(user.id, e.target.value);
                            }}
                            onBlur={() => setAddingRoleFor(null)}
                          >
                            <option value="" disabled>
                              Select role…
                            </option>
                            {availableRoles.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name.replace(/_/g, " ")}
                              </option>
                            ))}
                          </select>
                        ) : (
                          availableRoles.length > 0 && (
                            <button
                              onClick={() => setAddingRoleFor(user.id)}
                              disabled={isPending}
                              className="text-xs text-slate-400 hover:text-blue-600 border border-dashed
                                border-slate-300 hover:border-blue-400 rounded-full px-2 py-0.5
                                transition-colors"
                            >
                              + role
                            </button>
                          )
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.is_active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-slate-500">
                      {formatDate(user.created_at)}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() =>
                          handleToggleActive(user.id, user.is_active)
                        }
                        disabled={isPending}
                        className={`text-xs font-medium transition-colors ${
                          user.is_active
                            ? "text-red-500 hover:text-red-700"
                            : "text-emerald-600 hover:text-emerald-800"
                        }`}
                      >
                        {user.is_active ? "Archive" : "Restore"}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {users.filter((u) => showArchived ? !u.is_active : u.is_active).length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-slate-400 text-sm"
                  >
                    {showArchived ? "No archived users." : "No users yet. Use the buttons above to add someone."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Pending Invites ────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Pending Invites
          </h2>
          {pendingInvites.length > 0 && (
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {pendingInvites.length}
            </span>
          )}
        </div>

        {pendingError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-3">
            {pendingError}
          </p>
        )}
        {pendingSuccess && (
          <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 mb-3">
            {pendingSuccess}
          </p>
        )}

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {pendingInvites.length === 0 ? (
            <p className="px-6 py-10 text-center text-slate-400 text-sm">
              No pending invites.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3.5 font-medium text-slate-600">
                    Invitee
                  </th>
                  <th className="text-left px-6 py-3.5 font-medium text-slate-600">
                    Roles
                  </th>
                  <th className="text-left px-6 py-3.5 font-medium text-slate-600">
                    Invited
                  </th>
                  <th className="text-left px-6 py-3.5 font-medium text-slate-600">
                    Status
                  </th>
                  <th className="px-6 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingInvites.map((invite) => {
                  const expired = isInviteExpired(invite);
                  const isRevoking = revokingId === invite.id;

                  return (
                    <tr key={invite.id} className="align-middle">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Initials
                            name={invite.full_name}
                            email={invite.email}
                          />
                          <div>
                            <p className="font-medium text-slate-800">
                              {invite.full_name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {invite.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {invite.roles.length === 0 ? (
                            <span className="text-xs text-slate-400">—</span>
                          ) : (
                            invite.roles.map((roleName) => (
                              <span
                                key={roleName}
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  ROLE_COLORS[roleName as RoleName] ??
                                  "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {roleName.replace(/_/g, " ")}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-slate-500">
                        {formatDate(invite.created_at)}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            expired
                              ? "bg-amber-100 text-amber-700"
                              : "bg-sky-100 text-sky-700"
                          }`}
                        >
                          {expired ? "Expired" : "Pending"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 justify-end">
                          <button
                            onClick={() => handleResendEmail(invite.id)}
                            disabled={isPending}
                            className="text-xs text-slate-500 hover:text-blue-600 transition-colors
                              disabled:opacity-50"
                          >
                            Resend email
                          </button>
                          <button
                            onClick={() => handleResendLink(invite.id)}
                            disabled={isPending}
                            className="text-xs text-slate-500 hover:text-blue-600 transition-colors
                              disabled:opacity-50"
                          >
                            Copy link
                          </button>

                          {isRevoking ? (
                            <span className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-500">
                                Revoke?
                              </span>
                              <button
                                onClick={() => handleRevokeConfirm(invite.id)}
                                disabled={isPending}
                                className="text-xs font-medium text-red-600 hover:text-red-800
                                  disabled:opacity-50"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setRevokingId(null)}
                                className="text-xs text-slate-400 hover:text-slate-600"
                              >
                                No
                              </button>
                            </span>
                          ) : (
                            <button
                              onClick={() => setRevokingId(invite.id)}
                              disabled={isPending}
                              className="text-xs text-red-400 hover:text-red-600 transition-colors
                                disabled:opacity-50"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
