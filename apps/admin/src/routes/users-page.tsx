import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../lib/admin-api";
import { SectionHeading, LoadingBlock, ErrorBlock, Button, InlineNotice } from "@yinjie/ui";

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

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] border border-[color:var(--border-subtle)] bg-[color:var(--surface-console)] p-6 shadow-[var(--shadow-card)]">
        <SectionHeading
          title="用户管理"
          description={data ? `共 ${data.total} 名用户` : "用户列表"}
        />

        {isLoading && <LoadingBlock />}
        {error && <ErrorBlock message={error instanceof Error ? error.message : "加载失败"} />}

        {data && (
          <>
            <div className="mt-4 overflow-hidden rounded-2xl border border-[color:var(--border-faint)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--border-faint)] text-left text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
                    <th className="px-4 py-3">用户名</th>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">注册时间</th>
                    <th className="px-4 py-3">引导完成</th>
                    <th className="px-4 py-3">操作</th>
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
                        {user.id.slice(0, 8)}…
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
                          {user.onboardingCompleted ? "是" : "否"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {deletingId === user.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[color:var(--text-muted)]">确认删除？</span>
                            <button
                              className="text-xs text-red-400 hover:text-red-300"
                              onClick={() => deleteMutation.mutate(user.id)}
                              disabled={deleteMutation.isPending}
                            >
                              {deleteMutation.isPending ? "删除中…" : "确认"}
                            </button>
                            <button
                              className="text-xs text-[color:var(--text-muted)] hover:text-white"
                              onClick={() => setDeletingId(null)}
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <button
                            className="text-xs text-[color:var(--text-muted)] hover:text-red-400 transition"
                            onClick={() => setDeletingId(user.id)}
                          >
                            删除
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.total > data.limit && (
              <div className="mt-4 flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  上一页
                </Button>
                <span className="text-sm text-[color:var(--text-muted)]">
                  第 {page} 页 / 共 {Math.ceil(data.total / data.limit)} 页
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil(data.total / data.limit)}
                >
                  下一页
                </Button>
              </div>
            )}

            {deleteMutation.error && (
              <InlineNotice tone="error" className="mt-4">
                {deleteMutation.error instanceof Error ? deleteMutation.error.message : "删除失败"}
              </InlineNotice>
            )}
          </>
        )}
      </section>
    </div>
  );
}
