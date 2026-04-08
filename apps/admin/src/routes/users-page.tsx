import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../lib/admin-api";
import { Button, ErrorBlock, InlineNotice, LoadingBlock, SectionHeading } from "@yinjie/ui";

export function UsersPage() {
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: ["admin-users", page],
    queryFn: () => adminApi.getUsers(page),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setDeletingId(null);
    },
  });

  const { data, isLoading, error } = usersQuery;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] border border-[color:var(--border-subtle)] bg-[color:var(--surface-console)] p-6 shadow-[var(--shadow-card)]">
        <SectionHeading>Users</SectionHeading>
        <div className="mt-2 text-sm text-[color:var(--text-muted)]">
          {data ? `Total users: ${data.total}` : "User list"}
        </div>

        {isLoading ? <LoadingBlock className="mt-4" /> : null}
        {error ? <ErrorBlock message={error instanceof Error ? error.message : "Failed to load users"} /> : null}

        {data ? (
          <>
            <div className="mt-4 overflow-hidden rounded-2xl border border-[color:var(--border-faint)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--border-faint)] text-left text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
                    <th className="px-4 py-3">Username</th>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Onboarding</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-[color:var(--border-faint)] last:border-0 hover:bg-white/[0.03]"
                    >
                      <td className="px-4 py-3 font-medium text-white">{user.username}</td>
                      <td className="px-4 py-3 font-mono text-xs text-[color:var(--text-muted)]">
                        {user.id.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-3 text-[color:var(--text-secondary)]">
                        {new Date(user.createdAt).toLocaleDateString("zh-CN")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                            user.onboardingCompleted
                              ? "bg-green-500/15 text-green-400"
                              : "bg-yellow-500/15 text-yellow-400"
                          }`}
                        >
                          {user.onboardingCompleted ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {deletingId === user.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[color:var(--text-muted)]">Confirm delete?</span>
                            <button
                              className="text-xs text-red-400 hover:text-red-300"
                              onClick={() => deleteMutation.mutate(user.id)}
                              disabled={deleteMutation.isPending}
                            >
                              {deleteMutation.isPending ? "Deleting..." : "Confirm"}
                            </button>
                            <button
                              className="text-xs text-[color:var(--text-muted)] hover:text-white"
                              onClick={() => setDeletingId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            className="text-xs text-[color:var(--text-muted)] transition hover:text-red-400"
                            onClick={() => setDeletingId(user.id)}
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.total > data.limit ? (
              <div className="mt-4 flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-[color:var(--text-muted)]">
                  Page {page} / {totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            ) : null}

            {deleteMutation.error ? (
              <InlineNotice tone="danger" className="mt-4">
                {deleteMutation.error instanceof Error ? deleteMutation.error.message : "Delete failed"}
              </InlineNotice>
            ) : null}
          </>
        ) : null}
      </section>
    </div>
  );
}
