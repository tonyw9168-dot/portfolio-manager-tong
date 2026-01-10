# 桐的家庭基金 - 数据库备份

## 备份信息

- **备份时间**: 2026-01-10
- **数据库类型**: TiDB Cloud Serverless
- **数据库版本**: TiDB v7.5.2-serverless
- **数据库名称**: test

## 文件说明

| 文件名 | 说明 |
|--------|------|
| `schema.sql` | 数据库表结构（不含数据） |
| `data.sql` | 数据库数据（不含表结构） |
| `full_backup.sql` | 完整备份（表结构 + 数据） |

## 数据库表清单

1. **users** - 用户表
2. **asset_categories** - 资产大类
3. **assets** - 具体标的
4. **snapshots** - 时间点快照
5. **asset_values** - 资产价值记录
6. **cash_flows** - 现金流记录
7. **exchange_rates** - 汇率表
8. **portfolio_summary** - 投资组合汇总
9. **family_members** - 家庭成员表
10. **insurance_policies** - 保险保单表

## 恢复数据库

如需恢复数据库，可使用以下命令：

```bash
# 恢复完整备份
mysql -h <HOST> -P <PORT> -u <USER> -p <DATABASE> < full_backup.sql

# 或者分步恢复
mysql -h <HOST> -P <PORT> -u <USER> -p <DATABASE> < schema.sql
mysql -h <HOST> -P <PORT> -u <USER> -p <DATABASE> < data.sql
```

## TiDB Cloud 连接信息

- **Host**: gateway01.eu-central-1.prod.aws.tidbcloud.com
- **Port**: 4000
- **Database**: test
- **SSL**: 必须启用 TLS 连接

> ⚠️ 注意：密码和用户名请从 TiDB Cloud 控制台获取，不要在代码中硬编码。
