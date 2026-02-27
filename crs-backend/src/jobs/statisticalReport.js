// 管理员首页统计报表的日常生成任务
const {
  buildDashboardData,
  getDashboardReportKey,
  saveReport
} = require('../services/statisticalReportService');

// 执行一次报表生成并落库
// 可重复运行：同一天同一键会被覆盖更新
const runDashboardReportJob = async () => {
  try {
    const reportKey = getDashboardReportKey();
    const data = await buildDashboardData();
    await saveReport(reportKey, data);
  } catch (err) {
    console.warn('statistical report job failed:', err.message);
  }
};

// 计算距离下一个 HH:MM 的延迟（今天或明天）
const getNextRunDelayMs = (hour, minute) => {
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);

  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next.getTime() - now.getTime();
};

const startStatisticalReportJob = () => {
  // 启动时先跑一次，然后每天 00:10 执行
  // 确保管理员首页始终有可用报表
  runDashboardReportJob();

  const delay = getNextRunDelayMs(0, 10);
  setTimeout(() => {
    runDashboardReportJob();
    setInterval(runDashboardReportJob, 24 * 60 * 60 * 1000);
  }, delay);
};

module.exports = {
  startStatisticalReportJob
};
