# 隐界 — 自部署指南

## 快速部署（Docker Compose）

### 前提条件
- Docker 20.10+
- Docker Compose v2+
- 一台可访问的云服务器（VPS / 云主机）

### 步骤

**1. 克隆代码**
```bash
git clone https://github.com/your-org/yinjieAPP.git
cd yinjieAPP
```

**2. 配置环境变量**
```bash
cp api/.env.example api/.env
```

编辑 `api/.env`，填入你的 AI API Key 和 JWT 密钥：
```env
DEEPSEEK_API_KEY=sk-xxxxx          # 必填：你的 AI API Key
OPENAI_BASE_URL=https://api.deepseek.com  # 可换成 OpenAI 或其他兼容接口
AI_MODEL=deepseek-chat
JWT_SECRET=your-random-secret-here  # 必填：随机长字符串
PORT=3000
DATABASE_PATH=/app/data/database.sqlite
```

**3. 启动服务**
```bash
docker compose up -d
```

服务启动后，API 运行在 `http://服务器IP:3000`。

**4. 验证部署**
```bash
curl http://localhost:3000/api/characters
```

---

## Nginx 反向代理（推荐）

将 API 部署在域名下（支持 HTTPS），在 App 中填入域名地址。

```nginx
server {
    listen 443 ssl;
    server_name api.your-domain.com;

    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";  # 支持 WebSocket
    }
}
```

---

## 在 App / 桌面端连接你的服务器

### 移动端 App（iOS / Android）
1. 打开 App 后进入 **Setup 页面**
2. 在 "Core API URL" 中填入你的服务器地址，例如：`https://api.your-domain.com`
3. Socket URL 留空（自动使用 Core API 地址）
4. 点击 **Save remote config** 后继续注册/登录

### 桌面端（Windows / Mac）
桌面端默认在本地启动后端（local-hosted 模式）。  
如需连接远程服务器，在 Setup 页面切换到 Remote 模式并填入服务器地址。

---

## 用户自定义 AI APIKey

每个用户可以在 App 的个人资料页面设置自己的 AI APIKey，使用自己的 AI 额度。  
设置后，该用户的所有对话将优先使用其自定义 Key，不会消耗服务器配置的 Key。

API 接口：
```
PATCH /api/auth/users/:id/api-key
Body: { "apiKey": "sk-xxx", "apiBase": "https://api.openai.com/v1" }

DELETE /api/auth/users/:id/api-key
```

---

## 环境变量完整说明

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `DEEPSEEK_API_KEY` | 是 | AI API Key（支持 DeepSeek / OpenAI / Anthropic 等） |
| `OPENAI_BASE_URL` | 否 | AI API 接口地址，默认 `https://api.deepseek.com` |
| `AI_MODEL` | 否 | 默认 AI 模型，默认 `deepseek-chat` |
| `JWT_SECRET` | 是 | JWT 签名密钥，生产环境必须使用随机字符串 |
| `PORT` | 否 | 服务端口，默认 `3000` |
| `DATABASE_PATH` | 否 | SQLite 数据库路径，默认 `database.sqlite` |

---

## 升级更新

```bash
git pull
docker compose down
docker compose build --no-cache
docker compose up -d
```

数据库文件存储在 `./data/database.sqlite`，升级不会丢失数据。

---

## 常见问题

**Q: 支持哪些 AI 模型？**  
A: 支持所有 OpenAI Chat Completions 兼容接口，包括 DeepSeek、OpenAI、Anthropic (via proxy)、Google Gemini (via proxy)、Qwen 等。在管理后台可切换模型。

**Q: 数据存储在哪里？**  
A: 使用 SQLite，数据库文件在 `./data/database.sqlite`。建议定期备份该文件。

**Q: 多用户支持吗？**  
A: 支持。每个用户有独立账号，可各自设置自己的 AI APIKey。
