# 隐界部署指南

## 架构说明
- 官方云与自部署共用同一套后端代码
- 每个实例都是单租户世界，数据库默认使用 SQLite
- iOS、Android、Windows、macOS、Web 全部作为远程客户端接入
- 客户端只需要填写服务器地址，不在本地启动 Core API
- 用户可选配置自己的 API Key，服务端仅保存加密后的密文

## 快速部署

### 1. 克隆仓库
```bash
git clone https://github.com/your-org/yinjieAPP.git
cd yinjieAPP
```

### 2. 配置环境变量
```bash
cp api/.env.example api/.env
```

至少需要配置这些值：

```env
DEEPSEEK_API_KEY=sk-xxxxx
OPENAI_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-chat
JWT_SECRET=replace-with-a-long-random-secret
DATABASE_PATH=/app/data/database.sqlite
CORS_ALLOWED_ORIGINS=https://app.your-domain.com,https://admin.your-domain.com
PUBLIC_API_BASE_URL=https://api.your-domain.com
USER_API_KEY_ENCRYPTION_SECRET=replace-with-a-second-long-random-secret
```

### 3. 启动服务
```bash
docker compose up -d
```

### 4. 验证服务
```bash
curl http://localhost:3000/health
```

如果返回健康状态，说明后端已经可用。

## 反向代理

推荐为后端单独配置 HTTPS 域名，例如 `https://api.your-domain.com`。

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
        proxy_set_header Connection "upgrade";
    }
}
```

## 客户端接入

所有客户端流程一致：

1. 首次启动进入 `Setup`
2. 填写服务器地址，例如 `https://api.your-domain.com`
3. 如未单独暴露 Socket 服务，Socket 地址留空或与 API 地址一致
4. 保存配置后继续注册或登录

适用端：
- iOS
- Android
- Windows
- macOS
- Web

## 用户自定义 API Key

普通用户可在 App 的个人设置中配置自己的 API Key 和可选 Base URL。

行为规则：
- 未配置个人 Key 时，走实例默认 Provider
- 配置个人 Key 后，仅该用户的请求使用该 Key
- 清除个人 Key 后，立即回退到实例默认 Provider
- 任何读取接口都不会返回 Key 明文

接口：

```http
GET /api/auth/me
PATCH /api/auth/users/:id/api-key
DELETE /api/auth/users/:id/api-key
```

## 环境变量

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `DEEPSEEK_API_KEY` | 是 | 实例默认 Provider 的 API Key |
| `OPENAI_BASE_URL` | 否 | 默认 Provider 的 OpenAI 兼容地址 |
| `AI_MODEL` | 否 | 默认模型 |
| `JWT_SECRET` | 是 | 登录签名密钥 |
| `ADMIN_SECRET` | 否 | 管理后台鉴权密钥 |
| `PORT` | 否 | 服务端口，默认 `3000` |
| `DATABASE_PATH` | 否 | SQLite 文件路径 |
| `CORS_ALLOWED_ORIGINS` | 建议 | 允许访问的客户端域名，逗号分隔 |
| `PUBLIC_API_BASE_URL` | 建议 | 对外公开访问的 API 地址 |
| `USER_API_KEY_ENCRYPTION_SECRET` | 强烈建议 | 用户自定义 API Key 的加密密钥 |

## 升级

```bash
git pull
docker compose down
docker compose build --no-cache
docker compose up -d
```

默认数据库位于 `./data/database.sqlite`，升级不会自动清空数据。
