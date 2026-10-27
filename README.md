<div align="center">

# TRIPXU

**XU · AI 旅行智能体 —— 多智能体协作的文旅规划平台**

生成 → 深度手动编辑 → 持久化保存 → 导出路书 / Markdown

</div>

---

## 这是什么

TRIPXU 输入城市、日期和偏好，由多个智能体协作（小红书景点提纯、天气查询、酒店推荐）生成完整旅行计划；生成后你可以**像编辑文档一样大改行程**，保存进历史记录，最终导出为**手机可看的单文件路书**或**便于写博客的 Markdown**。

适合两种人：
- 出行前做攻略的旅行者
- 本地人规划"今天江汉路、明天东湖"式的周边游（可勾选**无需住宿**，跳过酒店搜索）

## 核心功能

### AI 生成
- **小红书深度集成**：景点与攻略来源于真实游记，LLM 提纯出避坑指南与打卡建议，景点图片实时搜索
- **多智能体协作**：景点搜索 / 天气预报 / 酒店推荐三路并发，最终由规划 Agent 融合生成
- **预约提醒**：自动识别需要提前预约的景点（故宫、省博等），行程卡醒目标注
- **多城市行程**：一次规划多个城市，城际移动日智能标注交通建议
- **知识图谱**：行程数据实时转为节点关系图
- **AI 伴游问答**：生成后左下角悬浮问答窗，AI 带完整行程上下文

### 深度手动编辑（本项目重点）
- **景点全属性**：名称 / 地址 / 游览时长 / 门票（免费或价格）/ 预约开关与提示 / 描述，全部可改
- **新增景点**：高德 POI 搜索（带定位）或纯手动填写
- **跨天移动**：任意景点移到其他天；同天上下排序
- **餐饮**：行内编辑、搜索/手动添加（带定位）、**可作为某景点的附属信息**（路书中渲染进对应景点条目）
- **住宿**：行内编辑、搜索/手动添加、删除；生成阶段可整体勾选「无需住宿」
- **交通段**：任意两个景点之间填写交通说明（如"二号线虎泉站A口上，江汉路B口出"），查看模式与路书均有独立渲染
- **每日文本**：行程描述 / 交通方式 / 住宿说明可编辑
- **预算联动**：任何增删改后门票/餐饮/住宿/合计自动重算，预算明细支持改价、删除与撤销恢复
- **持久化**：保存即回写后端任务文件，历史列表随时重新打开（也可删除历史计划）

### 导出
- **路书（单文件 HTML）**：移动端排版，自包含 CSS/JS/图片（base64 内联，文字部分断网可看），可直接发微信
  - 内嵌**高德交互地图**：所有带定位的景点/餐饮/酒店上图，标记按类型区分，点击弹属性卡，可缩放，支持「显示全部名称」开关
  - 每个景点带**高德导航深链**（手机唤起高德 App，未安装自动跳 Web 版）
  - 板块：天气速览 / 逐日时间轴（含交通段与附属餐饮）/ 门票预约表 / 预算概览 / 实用贴士
- **Markdown**：同构板块的纯文本行程，供旅行结束后写博客二次创作

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3 + TypeScript + Vite + Ant Design Vue + ECharts + Swiper |
| 后端 | FastAPI + HelloAgents 多智能体框架 + WebSocket 实时进度 |
| 地图 | 高德 JS API 2.0 / Web 服务 REST（支持 Google Maps 双引擎回退） |
| 模型 | 任意 OpenAI 兼容接口（推荐 DeepSeek 等支持长 JSON 输出的模型） |
| 存储 | 任务级 JSON 文件持久化（原子写），无数据库依赖 |

## 快速开始

### 环境要求
- Python 3.10+（推荐 [uv](https://github.com/astral-sh/uv)）
- Node.js 18+

### 配置凭据（3 类，均个人免费，仅 LLM 按量计费）

复制模板并填写：

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

| 凭据 | 变量 | 位置 | 获取 |
|---|---|---|---|
| LLM | `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL_ID` | `backend/.env` | 任意 OpenAI 兼容平台，如 DeepSeek：`https://api.deepseek.com/v1` + `deepseek-chat` |
| 小红书 Cookie | `XHS_COOKIE` | `backend/.env` | 网页端登录后 F12 → Network → 复制任意请求头 `cookie` 整行（需含 `web_session`） |
| 高德 Web服务 Key | `VITE_AMAP_WEB_KEY` | `backend/.env` | console.amap.com → 创建应用 → 添加 Key（服务平台选 **Web服务**） |
| 高德 JS API Key | `VITE_AMAP_WEB_JS_KEY` | `frontend/.env` | 同上，服务平台选 **Web端(JS API)** |
| 高德安全密钥 | `VITE_AMAP_SECURITY_JS_CODE` | `frontend/.env` | JS API Key 详情页「安全密钥」，改后需重启前端 |

> 小红书 Cookie 有寿命，过期表现为任务报【认证失败】，重新复制即可；建议用小号，高频调用有风控风险。

### 本地开发

```bash
# 后端（首次自动建虚拟环境）
cd backend
uv venv .venv && uv pip install --python .venv/Scripts/python.exe -r requirements.txt
.venv/Scripts/python.exe -m uvicorn app.api.main:app --host 0.0.0.0 --port 8000

# 前端（另开终端）
cd frontend
npm install
npm run dev        # http://localhost:5173
```

API 交互文档：`http://localhost:8000/docs`

### 生产部署（cloudflared tunnel 同源单端口）

后端检测到 `frontend/dist` 存在时会自动托管前端静态文件，因此只需一个隧道指向 8000：

```bash
# 1. 构建前端（同源部署需置空 VITE_API_BASE_URL）
cd frontend && npm run build

# 2. 启动后端
cd backend && .venv/Scripts/python.exe -m uvicorn app.api.main:app --host 0.0.0.0 --port 8000

# 3. 创建并运行隧道（一次性：login + create + route dns）
cloudflared tunnel create <名字>
cloudflared tunnel route dns <隧道UUID> <你的子域名>
cloudflared tunnel --config <配置文件.yml> run <名字>
```

隧道配置示例（`~/.cloudflared/config-<名字>.yml`）：

```yaml
tunnel: <名字>
credentials-file: C:\Users\<你>\.cloudflared\<UUID>.json

ingress:
  - hostname: <你的子域名>
    service: http://localhost:8000
  - service: http_status:404
```

> 注意：`cloudflared tunnel route dns` 建议直接用隧道 UUID（用名字时可能被默认 config.yml 里的其它隧道抢注）；Git Bash 下运行 `--config` 需加 `MSYS2_ARG_CONV_EXCL='*'` 前缀。

## 主要 API

| 端点 | 说明 |
|---|---|
| `POST /api/trip/plan` | 提交规划任务（返回 task_id + ws_url） |
| `WS /api/trip/ws/{task_id}` | 实时进度推送 |
| `PUT /api/trip/plan/{task_id}` | 保存编辑后的行程（落盘） |
| `DELETE /api/trip/plan/{task_id}` | 删除历史行程 |
| `GET /api/trip/history` | 历史计划列表 |
| `GET /api/poi/search` | 高德 POI 搜索（新增景点/餐饮/住宿用） |
| `GET /api/poi/image` | 小红书图片代理（规避防盗链） |
| `POST /api/chat/ask` | 行程上下文 AI 问答 |
| `GET/PUT /api/settings` | 运行时配置（热生效，优先级高于 .env） |

## 目录结构

```
backend/
  app/
    agents/          # 多智能体（行程规划/天气/酒店）
    api/routes/      # FastAPI 路由（trip/poi/map/chat/settings/memory）
    services/        # 小红书/高德/Google Maps/LLM/知识图谱
    models/schemas.py
  data/trip_tasks/   # 行程持久化 JSON（含手动编辑结果）
frontend/
  src/
    views/           # Landing（表单+历史）/ Result（结果页）
    components/      # AIChat / NavBar / MealAddModal / HotelAddModal ...
    utils/roadbook.ts  # 路书 HTML / Markdown 渲染器
    i18n/            # 文案（中文版）
```

## License

GPL-2.0，见 [LICENSE](LICENSE)。
