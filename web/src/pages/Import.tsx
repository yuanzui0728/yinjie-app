import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Colors } from '../theme/colors';

type Step = 'input' | 'processing' | 'done' | 'error';

export function Import() {
  const navigate = useNavigate();
  const [personName, setPersonName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [step, setStep] = useState<Step>('input');
  const [progress, setProgress] = useState(0);
  const [characterId, setCharacterId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setFileContent(ev.target?.result as string ?? '');
    reader.readAsText(file, 'utf-8');
  };

  const handleStart = async () => {
    if (!personName.trim() || !fileContent) return;
    setStep('processing');
    setProgress(0);
    try {
      const { jobId } = await api.startImport(personName.trim(), fileContent);
      // Poll for status
      const poll = setInterval(async () => {
        try {
          const status = await api.getImportStatus(jobId);
          setProgress(status.progress);
          if (status.status === 'done' && status.characterId) {
            clearInterval(poll);
            setCharacterId(status.characterId);
            setStep('done');
          } else if (status.status === 'error') {
            clearInterval(poll);
            setErrorMsg(status.error ?? '导入失败');
            setStep('error');
          }
        } catch {
          clearInterval(poll);
          setErrorMsg('网络错误，请重试');
          setStep('error');
        }
      }, 1500);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : '启动失败');
      setStep('error');
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: Colors.bgMain, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center',
        backgroundColor: Colors.navBg, padding: '8px 12px',
        borderBottom: `0.5px solid ${Colors.navBorder}`, flexShrink: 0,
      }}>
        <button onClick={() => navigate(-1)} style={{ padding: 8, background: 'none', border: 'none', cursor: 'pointer', width: 40 }}>
          <span style={{ fontSize: 18, color: Colors.textPrimary }}>✕</span>
        </button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 600, color: Colors.textPrimary }}>
          导入聊天记录
        </span>
        <div style={{ width: 40 }} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px' }}>
        {step === 'input' && (
          <>
            <div style={{ fontSize: 13, color: Colors.textSecondary, lineHeight: '20px', marginBottom: 24 }}>
              上传与某人的聊天记录（.txt 格式），AI 会自动学习 TA 的说话风格，生成专属角色。
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: Colors.textSecondary, fontWeight: 500, marginBottom: 8 }}>TA 的名字</div>
              <input
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="例如：小明、妈妈、老王"
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 10,
                  border: `1px solid ${Colors.border}`, fontSize: 15,
                  color: Colors.textPrimary, backgroundColor: Colors.bgCard,
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 13, color: Colors.textSecondary, fontWeight: 500, marginBottom: 8 }}>聊天记录文件</div>
              <input ref={fileRef} type="file" accept=".txt" style={{ display: 'none' }} onChange={handleFileSelect} />
              <button
                onClick={() => fileRef.current?.click()}
                style={{
                  width: '100%', padding: '20px', borderRadius: 12,
                  border: `1.5px dashed ${fileContent ? Colors.primary : Colors.border}`,
                  backgroundColor: fileContent ? 'rgba(249,115,22,0.04)' : Colors.bgCard,
                  cursor: 'pointer', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 8,
                }}
              >
                <span style={{ fontSize: 32 }}>{fileContent ? '✅' : '📄'}</span>
                <span style={{ fontSize: 14, color: fileContent ? Colors.primary : Colors.textSecondary }}>
                  {fileContent ? fileName : '点击选择 .txt 文件'}
                </span>
                {fileContent && (
                  <span style={{ fontSize: 12, color: Colors.textLight }}>
                    {Math.round(fileContent.length / 1000)}k 字符
                  </span>
                )}
              </button>
            </div>

            <button
              onClick={handleStart}
              disabled={!personName.trim() || !fileContent}
              style={{
                width: '100%', padding: '14px',
                background: personName.trim() && fileContent
                  ? 'linear-gradient(135deg, #F97316 0%, #FBBF24 100%)'
                  : Colors.bgInput,
                border: 'none', borderRadius: 12,
                color: personName.trim() && fileContent ? '#fff' : Colors.textLight,
                fontSize: 16, fontWeight: 600, cursor: personName.trim() && fileContent ? 'pointer' : 'default',
              }}
            >
              开始导入
            </button>
          </>
        )}

        {step === 'processing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60, gap: 24 }}>
            <span style={{ fontSize: 56 }}>🧠</span>
            <div style={{ fontSize: 16, fontWeight: 600, color: Colors.textPrimary }}>AI 正在学习说话风格…</div>
            <div style={{ width: '100%', backgroundColor: Colors.bgInput, borderRadius: 8, height: 8, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 8,
                background: 'linear-gradient(90deg, #F97316, #FBBF24)',
                width: `${progress}%`, transition: 'width 0.5s ease',
              }} />
            </div>
            <div style={{ fontSize: 13, color: Colors.textSecondary }}>{progress}%</div>
          </div>
        )}

        {step === 'done' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60, gap: 20 }}>
            <span style={{ fontSize: 64 }}>🎉</span>
            <div style={{ fontSize: 18, fontWeight: 700, color: Colors.textPrimary }}>导入成功！</div>
            <div style={{ fontSize: 14, color: Colors.textSecondary, textAlign: 'center' }}>
              {personName} 的角色已创建，快去和 TA 聊聊吧
            </div>
            <button
              onClick={() => navigate(`/character/${characterId}`)}
              style={{
                marginTop: 8, padding: '14px 32px',
                background: 'linear-gradient(135deg, #F97316 0%, #FBBF24 100%)',
                border: 'none', borderRadius: 12,
                color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
              }}
            >
              查看角色
            </button>
          </div>
        )}

        {step === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60, gap: 20 }}>
            <span style={{ fontSize: 56 }}>😕</span>
            <div style={{ fontSize: 16, fontWeight: 600, color: Colors.textPrimary }}>导入失败</div>
            <div style={{ fontSize: 13, color: Colors.textSecondary }}>{errorMsg}</div>
            <button
              onClick={() => setStep('input')}
              style={{
                padding: '12px 28px', borderRadius: 10,
                border: `1px solid ${Colors.border}`, background: 'none',
                color: Colors.textPrimary, fontSize: 14, cursor: 'pointer',
              }}
            >
              重试
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
