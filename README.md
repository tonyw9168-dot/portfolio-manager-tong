# 桐的家庭基金 - 个人投资组合管理系统

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-18%2B-green.svg)

一个功能完善的个人投资组合管理系统，帮助您追踪、分析和预测您的资产配置。

## ✨ 功能特点

- 📊 **资产概览** - 直观的仪表板展示总资产、配置比例和趋势
- 📈 **持仓明细** - 详细查看各类资产的持仓情况
- 🔍 **高级分析** - 多维度的资产对比分析
- 📅 **历史对比** - 追踪不同时间点的资产变化
- 🎯 **目标配置** - 设定并追踪目标资产配置
- 🔮 **走势预测** - 基于市场研究的资产走势预测
- 💰 **现金流量** - 记录资金流入流出
- 📱 **响应式设计** - 支持桌面和移动设备

## 🚀 快速开始

### 环境要求

- Node.js 18+
- pnpm（推荐）

### 安装运行

```bash
# 克隆仓库
git clone https://github.com/your-username/portfolio-manager.git
cd portfolio-manager

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 访问 http://localhost:3000
# 默认密码: portfolio2026
```

## 📁 项目结构

```
portfolio-manager/
├── client/                 # 前端代码
│   ├── src/
│   │   ├── components/    # 通用组件
│   │   ├── contexts/      # React Context
│   │   ├── pages/         # 页面组件
│   │   └── lib/           # 工具函数
│   └── index.html
├── server/                 # 后端代码
│   ├── _core/             # 核心模块
│   ├── db.ts              # 数据库操作
│   └── routers.ts         # API路由
├── drizzle/               # 数据库Schema
├── data.json              # 数据存储文件
└── DEPLOYMENT.md          # 部署文档
```

## 📊 数据导入

支持通过Excel文件导入投资组合数据：

1. 点击页面上的"导入Excel"按钮
2. 选择您的Excel文件
3. 系统自动解析并导入数据

## 🌐 部署

详细部署说明请参考 [DEPLOYMENT.md](./DEPLOYMENT.md)

支持部署到：
- Vercel（推荐，免费）
- Railway
- Render
- 自有服务器

## 🛠 技术栈

- **前端**: React, TypeScript, Vite, TailwindCSS, shadcn/ui, Recharts
- **后端**: Node.js, Express, tRPC
- **数据**: 本地JSON文件存储

## 📝 许可证

MIT License

## 🙏 致谢

感谢所有开源项目的贡献者！
