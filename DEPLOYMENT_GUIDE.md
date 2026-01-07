# 桐的家庭基金 - 部署指南

## 项目概述

这是一个个人资产管理网站，用于追踪和分析您的投资组合。网站包含以下功能：

- **资产仪表板** - 实时查看您的投资组合总资产和分布
- **持仓明细** - 详细的资产持仓信息
- **资产走势预测** - 基于市场研究的未来一个月资产走势预测
- **数据分析** - 多维度的资产分析和报告
- **数据导入** - 支持通过 Excel 导入您的投资数据

## 快速部署到 Vercel（推荐）

### 方式一：通过 GitHub 自动部署（最简单）

1. **访问 Vercel 官网**
   - 打开 https://vercel.com
   - 点击 "Sign Up" 注册账号（建议使用 GitHub 账号登录）

2. **导入项目**
   - 登录后点击 "New Project"
   - 选择 "Import Git Repository"
   - 搜索并选择 `portfolio-manager-tong` 仓库

3. **配置项目**
   - Framework Preset: 选择 "Vite"
   - Build Command: `pnpm build`
   - Output Directory: `dist`
   - 点击 "Deploy"

4. **等待部署完成**
   - Vercel 会自动构建并部署您的网站
   - 部署完成后会获得一个永久的访问链接，格式如：`https://portfolio-manager-tong.vercel.app`

### 方式二：本地构建后部署

```bash
# 1. 克隆项目
git clone https://github.com/tonyw9168-dot/portfolio-manager-tong.git
cd portfolio-manager-tong

# 2. 安装依赖
pnpm install

# 3. 构建项目
pnpm build

# 4. 本地测试（可选）
pnpm preview

# 5. 使用 Vercel CLI 部署
npm install -g vercel
vercel
```

## 本地运行

如果您想在本地开发或运行网站：

```bash
# 1. 安装依赖
pnpm install

# 2. 启动开发服务器
pnpm dev

# 3. 打开浏览器访问
# http://localhost:5173
# 访问密码：portfolio2026
```

## 数据管理

### 导入数据

1. 登录网站后，点击导入按钮
2. 选择您的 Excel 文件（格式参考 `test-data.xlsx`）
3. 系统会自动解析并导入数据

### 数据存储

- 数据存储在本地 JSON 文件中（`data.json`）
- 部署到 Vercel 后，数据会存储在 Vercel 的临时存储中
- **重要**：如果需要持久化数据，建议配置数据库（如 PostgreSQL）

## 自定义配置

### 修改品牌名称

编辑 `client/src/components/Layout.tsx`，找到品牌名称并修改：

```typescript
const brandName = "桐的家庭基金"; // 修改这里
```

### 修改主题色

编辑 `client/src/index.css`，修改 CSS 变量：

```css
:root {
  --primary: #3b82f6; /* 蓝色 */
  /* 其他颜色配置 */
}
```

### 修改访问密码

编辑 `client/src/contexts/AuthContext.tsx`，找到密码验证逻辑并修改。

## 常见问题

### Q: 网站无法访问
A: 检查 Vercel 部署状态，确保构建成功。查看部署日志以了解具体错误。

### Q: 数据丢失
A: 本地存储的数据在刷新页面后会保留，但部署到云端后需要配置数据库才能持久化。

### Q: 如何更新网站
A: 在 GitHub 上提交代码更改后，Vercel 会自动重新构建和部署。

## 技术栈

- **前端框架**: React + TypeScript
- **UI 组件库**: shadcn/ui
- **样式**: TailwindCSS
- **构建工具**: Vite
- **包管理**: pnpm
- **后端**: Node.js + Express（可选）

## 支持

如有问题，请参考项目 README 或联系开发者。

---

**最后更新**: 2026年1月7日
**品牌**: 桐的家庭基金
**主题色**: 蓝色
