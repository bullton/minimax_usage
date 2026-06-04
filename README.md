# MiniMax Token Plan Monitor

MiniMax API用量监控面板，实时展示Token使用情况。

## 功能

- 5小时窗口用量仪表盘
- 周用量仪表盘
- 剩余配额进度条
- 月度用量明细（手动刷新）
- 模型分布饼图
- 自动刷新（10秒）

## 部署

```bash
npm install
cp .env.example .env
# 编辑 .env 填入 API Keys
npm start
```

访问 http://localhost:3000

## API Keys

需要配置以下环境变量：

```
MINIMAX_API_KEY=your_api_key
MINIMAX_GROUP_ID=your_group_id
```