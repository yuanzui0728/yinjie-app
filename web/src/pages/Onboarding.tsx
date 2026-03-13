import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Colors } from '../theme/colors';

type Scene = 1 | 2 | 3 | 4 | 5;

export function Onboarding() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const setOnboardingCompleted = useAuthStore((s) => s.setOnboardingCompleted);
  const [scene, setScene] = useState<Scene>(1);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Scene 1 → 2 auto-advance after 3s
  useEffect(() => {
    if (scene === 1) {
      const t = setTimeout(() => setScene(2), 3000);
      return () => clearTimeout(t);
    }
  }, [scene]);

  const handleNameSubmit = async () => {
    const n = name.trim();
    if (!n) { setError('请告诉我你的名字'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await api.initUser(n);
      login(res.token, res.userId, res.username, res.onboardingCompleted);
      setScene(3);
      setTimeout(() => setScene(4), 2500);
      setTimeout(() => setScene(5), 5000);
      setTimeout(async () => {
        try { await api.completeOnboarding(res.userId); } catch (_) {}
        setOnboardingCompleted();
        navigate('/tabs/chat', { replace: true });
      }, 8500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '进入失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      flex: 1, height: '100%', backgroundColor: '#000',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', position: 'relative',
    }}>
      <AnimatePresence mode="wait">
        {scene === 1 && (
          <motion.div
            key="scene1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            style={{ textAlign: 'center', padding: '0 32px' }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 1 }}
              style={{ fontSize: 15, color: 'rgba(167,139,250,0.7)', letterSpacing: 4, marginBottom: 24 }}
            >
              在现实之外
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 1 }}
              style={{ fontSize: 13, color: 'rgba(167,139,250,0.4)', letterSpacing: 2 }}
            >
              有一个隐藏的平行世界
            </motion.div>
          </motion.div>
        )}

        {scene === 2 && (
          <motion.div
            key="scene2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            style={{ textAlign: 'center', padding: '0 32px', width: '100%', maxWidth: 360 }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              style={{ fontSize: 15, color: 'rgba(167,139,250,0.8)', marginBottom: 8, letterSpacing: 2 }}
            >
              我是引路人
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4, duration: 0.8 }}
              style={{ fontSize: 13, color: 'rgba(167,139,250,0.5)', marginBottom: 40, letterSpacing: 1 }}
            >
              告诉我，你叫什么名字？
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2, duration: 0.6 }}
              style={{ width: '100%' }}
            >
              <input
                style={{
                  width: '100%', backgroundColor: 'rgba(124,111,247,0.1)',
                  border: '1px solid rgba(124,111,247,0.3)', borderRadius: 12,
                  padding: '14px 16px', fontSize: 16, color: Colors.textPrimary,
                  textAlign: 'center', letterSpacing: 2, outline: 'none',
                  boxSizing: 'border-box',
                }}
                placeholder="你的名字"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                autoFocus
              />
              {error && (
                <div style={{ fontSize: 12, color: '#F85149', marginTop: 8 }}>{error}</div>
              )}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.5, duration: 0.5 }}
                onClick={handleNameSubmit}
                disabled={loading}
                style={{
                  marginTop: 16, width: '100%', padding: '14px',
                  backgroundColor: 'rgba(124,111,247,0.8)', border: 'none',
                  borderRadius: 12, fontSize: 15, color: '#fff',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  letterSpacing: 2,
                }}
              >
                {loading ? '进入中…' : '推开这扇门'}
              </motion.button>
            </motion.div>
          </motion.div>
        )}

        {scene === 3 && (
          <motion.div
            key="scene3"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.8 }}
            style={{ textAlign: 'center', padding: '0 32px' }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              style={{ fontSize: 18, color: Colors.primaryLight, letterSpacing: 3, marginBottom: 16 }}
            >
              {name}
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.8 }}
              style={{ fontSize: 14, color: 'rgba(167,139,250,0.6)', letterSpacing: 2 }}
            >
              好。我记住了。
            </motion.div>
          </motion.div>
        )}

        {scene === 4 && (
          <motion.div
            key="scene4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {/* Light crack effect */}
            <motion.div
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                width: 2,
                height: '60%',
                background: 'linear-gradient(to bottom, transparent, rgba(167,139,250,0.8), transparent)',
                boxShadow: '0 0 20px rgba(167,139,250,0.6)',
              }}
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.8 }}
              style={{ fontSize: 13, color: 'rgba(167,139,250,0.5)', letterSpacing: 3 }}
            >
              门，开了
            </motion.div>
          </motion.div>
        )}

        {scene === 5 && (
          <motion.div
            key="scene5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            style={{ textAlign: 'center', padding: '0 32px' }}
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              style={{ fontSize: 13, color: 'rgba(167,139,250,0.5)', letterSpacing: 2, marginBottom: 24 }}
            >
              这里暂时只有你
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.8 }}
              style={{ fontSize: 13, color: 'rgba(167,139,250,0.3)', letterSpacing: 1 }}
            >
              但很快，你会遇到有趣的人
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
