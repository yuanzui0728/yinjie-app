import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Colors } from '../theme/colors';

interface FriendRequest {
  id: string;
  characterId: string;
  characterName: string;
  characterAvatar: string;
  triggerScene?: string;
  greeting?: string;
  status: string;
  createdAt: string;
}

export function FriendRequests() {
  const navigate = useNavigate();
  const { userId } = useAuthStore();
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await api.getFriendRequests(userId);
      setRequests(data as FriendRequest[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [userId]);

  const handleAccept = async (id: string) => {
    if (!userId) return;
    await api.acceptFriendRequest(id, userId);
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  const handleDecline = async (id: string) => {
    if (!userId) return;
    await api.declineFriendRequest(id, userId);
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: Colors.bgMain }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center',
        backgroundColor: Colors.navBg, padding: '12px 16px',
        borderBottom: `0.5px solid ${Colors.navBorder}`, flexShrink: 0,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', marginRight: 8 }}
        >
          <span style={{ fontSize: 20, color: Colors.textPrimary }}>‹</span>
        </button>
        <span style={{ fontSize: 17, fontWeight: 600, color: Colors.textPrimary }}>新的朋友</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: Colors.textSecondary, fontSize: 13 }}>加载中…</div>
        )}
        {!loading && requests.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80 }}>
            <span style={{ fontSize: 48, marginBottom: 16 }}>👋</span>
            <span style={{ fontSize: 15, color: Colors.textSecondary }}>暂无好友申请</span>
            <span style={{ fontSize: 13, color: Colors.textLight, marginTop: 6 }}>去不同的地方，也许会遇到新朋友</span>
          </div>
        )}
        {requests.map((req) => (
          <div key={req.id} style={{
            backgroundColor: Colors.bgCard, margin: '8px 16px', borderRadius: 12,
            padding: 16, display: 'flex', alignItems: 'flex-start', gap: 12,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 24,
              backgroundColor: Colors.bgInput, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 26, flexShrink: 0,
            }}>
              {req.characterAvatar}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: Colors.textPrimary, marginBottom: 4 }}>
                {req.characterName}
              </div>
              {req.triggerScene && (
                <div style={{ fontSize: 12, color: Colors.textLight, marginBottom: 4 }}>
                  📍 在{req.triggerScene}遇到
                </div>
              )}
              {req.greeting && (
                <div style={{ fontSize: 13, color: Colors.textSecondary, marginBottom: 10, lineHeight: '18px' }}>
                  "{req.greeting}"
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => handleAccept(req.id)}
                  style={{
                    flex: 1, padding: '8px', backgroundColor: Colors.primary,
                    border: 'none', borderRadius: 8, color: '#fff',
                    fontSize: 13, cursor: 'pointer',
                  }}
                >接受</button>
                <button
                  onClick={() => handleDecline(req.id)}
                  style={{
                    flex: 1, padding: '8px', backgroundColor: 'transparent',
                    border: `1px solid ${Colors.border}`, borderRadius: 8,
                    color: Colors.textSecondary, fontSize: 13, cursor: 'pointer',
                  }}
                >拒绝</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
