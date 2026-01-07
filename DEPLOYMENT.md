# 桐的家庭基金 - 个人投资组合管理系统

## 项目简介

这是一个个人投资组合管理系统，用于追踪和分析您的资产配置。主要功能包括：

- **仪表板** - 总资产概览、资产配置饼图、趋势图
- **持仓明细** - 查看各类资产的详细持仓
- **高级分析** - 资产类别对比分析
- **历史对比** - 不同时间点的资产变化
- **投资总结** - 投资组合总结报告
- **盈亏明细** - 各资产盈亏详情
- **绩效报告** - 投资绩效分析
- **目标配置** - 设定目标资产配置比例
- **走势预测** - 基于市场研究的资产走势预测
- **现金流量** - 现金流入流出记录
- **设置** - 系统设置

## 技术栈

- **前端**: React + TypeScript + Vite + TailwindCSS + shadcn/ui
- **后端**: Node.js + Express + tRPC
- **图表**: Recharts
- **数据存储**: 本地JSON文件存储（无需外部数据库）

## 本地运行

### 环境要求

- Node.js 18+ 
- pnpm（推荐）或 npm

### 安装步骤

1. **安装依赖**
   ```bash
   pnpm install
   # 或
   npm install
   ```

2. **启动开发服务器**
   ```bash
   pnpm dev
   # 或
   npm run dev
   ```

3. **访问网站**
   打开浏览器访问 http://localhost:3000

4. **默认访问密码**
   ```
   portfolio2026
   ```

## 数据导入

### 通过网页导入

1. 登录系统后，点击"导入Excel"按钮
2. 选择您的投资组合Excel文件
3. 系统会自动解析并导入数据

### Excel文件格式

Excel文件应包含以下列：
- 资产类别（如：美股、A+H股、日股、黄金、虚拟货币、现金）
- 标的名称
- 币种
- 各时间点的价值数据

## 部署到云平台

### 方案一：部署到 Vercel（推荐，免费）

1. 将代码推送到GitHub
2. 访问 https://vercel.com
3. 使用GitHub账号登录
4. 点击"New Project"，导入此仓库
5. 点击"Deploy"即可

### 方案二：部署到 Railway

1. 访问 https://railway.app
2. 使用GitHub账号登录
3. 点击"New Project" > "Deploy from GitHub repo"
4. 选择此仓库
5. Railway会自动检测并部署

### 方案三：部署到 Render

1. 访问 https://render.com
2. 创建账号并登录
3. 点击"New" > "Web Service"
4. 连接GitHub并选择此仓库
5. 配置：
   - Build Command: `pnpm install && pnpm build`
   - Start Command: `pnpm start`

### 方案四：部署到自有服务器

1. 克隆代码到服务器
   ```bash
   git clone <your-repo-url>
   cd portfolio-manager
   ```

2. 安装依赖并构建
   ```bash
   pnpm install
   pnpm build
   ```

3. 启动生产服务器
   ```bash
   pnpm start
   ```

4. 使用 nginx 或其他反向代理配置域名

## 数据备份

数据存储在项目根目录的 `data.json` 文件中。建议定期备份此文件。

## 修改访问密码

编辑 `client/src/contexts/AuthContext.tsx` 文件，找到以下代码：

```typescript
const VALID_PASSWORD = "portfolio2026";
```

将 `portfolio2026` 修改为您想要的密码。

## 修改品牌名称

编辑 `client/src/components/Layout.tsx` 文件，找到以下代码：

```typescript
<h1 className="text-lg font-bold text-foreground">桐的家庭基金</h1>
```

将"桐的家庭基金"修改为您想要的名称。

## 常见问题

### Q: 数据存储在哪里？
A: 数据存储在项目根目录的 `data.json` 文件中，无需配置外部数据库。

### Q: 如何更新数据？
A: 通过网页上的"导入Excel"功能重新导入最新数据即可。

### Q: 忘记密码怎么办？
A: 查看 `client/src/contexts/AuthContext.tsx` 文件中的 `VALID_PASSWORD` 变量。

## 联系与支持

如有问题，请在GitHub仓库提交Issue。

---

**版本**: 1.0.0  
**最后更新**: 2026年1月7日
