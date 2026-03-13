import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../theme/colors';

interface FeedPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorType: string;
  text: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  comments?: { authorName: string; authorAvatar: string; text: string }[];
}

export function Discover() {
  const { userId, username } = useAuthStore();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [composing, setComposing] = useState(false);
  const [newText, setNewText] = useState('');
  const [posting, setPosting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getFeed();
      setPosts((res.posts ?? []) as FeedPost[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handlePost = async () => {
    if (!newText.trim() || !userId || !username) return;
    setPosting(true);
    try {
      await api.createFeedPost(userId, username, '🙂', newText.trim());
      setNewText('');
      setComposing(false);
      await load();
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!userId) return;
    await api.likeFeedPost(postId, userId);
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, likeCount: p.likeCount + 1 } : p));
  };

  const handleComment = async (postId: string) => {
    if (!commentText.trim() || !userId || !username) return;
    await api.addFeedComment(postId, userId, username, '🙂', commentText.trim());
    setCommentText('');
    await load();
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: Colors.bgMain }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: Colors.navBg, padding: '12px 16px',
        borderBottom: `0.5px solid ${Colors.navBorder}`, flexShrink: 0,
      }}>
        <span style={{ fontSize: 17, fontWeight: 600, color: Colors.textPrimary }}>发现</span>
        <button
          onClick={() => setComposing(true)}
          style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <span style={{ fontSize: 22, color: Colors.primary }}>＋</span>
        </button>
      </div>

      {/* Compose modal */}
      {composing && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'flex-end', zIndex: 100,
        }}>
          <div style={{
            width: '100%', backgroundColor: Colors.bgCard,
            borderRadius: '16px 16px 0 0', padding: 20,
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: Colors.textPrimary, marginBottom: 12 }}>发布内容</div>
            <textarea
              style={{
                width: '100%', minHeight: 100, backgroundColor: Colors.bgInput,
                border: `1px solid ${Colors.border}`, borderRadius: 8,
                padding: 12, fontSize: 15, color: Colors.textPrimary,
                resize: 'none', outline: 'none', boxSizing: 'border-box',
              }}
              placeholder="分享你的想法…"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                onClick={() => { setComposing(false); setNewText(''); }}
                style={{
                  flex: 1, padding: '12px', borderRadius: 8,
                  border: `1px solid ${Colors.border}`, background: 'none',
                  color: Colors.textSecondary, fontSize: 15, cursor: 'pointer',
                }}
              >取消</button>
              <button
                onClick={handlePost}
                disabled={posting || !newText.trim()}
                style={{
                  flex: 1, padding: '12px', borderRadius: 8,
                  backgroundColor: Colors.primary, border: 'none',
                  color: '#fff', fontSize: 15, cursor: 'pointer',
                  opacity: posting || !newText.trim() ? 0.6 : 1,
                }}
              >{posting ? '发布中…' : '发布'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Feed */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: Colors.textSecondary, fontSize: 13 }}>加载中…</div>
        ) : posts.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80 }}>
            <span style={{ fontSize: 48, marginBottom: 16 }}>🎬</span>
            <span style={{ fontSize: 15, color: Colors.textSecondary }}>还没有内容</span>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} style={{ backgroundColor: Colors.bgCard, marginBottom: 8, padding: '16px' }}>
              {/* Author */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: Colors.bgInput, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, marginRight: 10, flexShrink: 0,
                }}>
                  {post.authorAvatar}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: Colors.primary }}>{post.authorName}</div>
                  <div style={{ fontSize: 11, color: Colors.textLight }}>
                    {new Date(post.createdAt).toLocaleDateString('zh-CN')}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div style={{ fontSize: 15, color: Colors.textPrimary, lineHeight: '22px', marginBottom: 12 }}>
                {post.text}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 16, borderTop: `0.5px solid ${Colors.border}`, paddingTop: 10 }}>
                <button
                  onClick={() => handleLike(post.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <span style={{ fontSize: 16 }}>❤️</span>
                  <span style={{ fontSize: 13, color: Colors.textSecondary }}>{post.likeCount}</span>
                </button>
                <button
                  onClick={() => setExpandedId(expandedId === post.id ? null : post.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <span style={{ fontSize: 16 }}>💬</span>
                  <span style={{ fontSize: 13, color: Colors.textSecondary }}>{post.commentCount}</span>
                </button>
              </div>

              {/* Comments */}
              {expandedId === post.id && (
                <div style={{ marginTop: 10 }}>
                  {(post.comments ?? []).map((c, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 16 }}>{c.authorAvatar}</span>
                      <div>
                        <span style={{ fontSize: 13, color: Colors.primary, fontWeight: 500 }}>{c.authorName}：</span>
                        <span style={{ fontSize: 13, color: Colors.textPrimary }}>{c.text}</span>
                      </div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <input
                      style={{
                        flex: 1, backgroundColor: Colors.bgInput, border: `1px solid ${Colors.border}`,
                        borderRadius: 8, padding: '8px 12px', fontSize: 13, color: Colors.textPrimary, outline: 'none',
                      }}
                      placeholder="写评论…"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id)}
                    />
                    <button
                      onClick={() => handleComment(post.id)}
                      style={{
                        padding: '8px 14px', backgroundColor: Colors.primary,
                        border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, cursor: 'pointer',
                      }}
                    >发送</button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
