/**
 * 预约导出工具
 * 设计目标：
 * 1) 统一“我的预约”导出列顺序与列名，避免不同页面导出不一致
 * 2) 统一 CSV 与 Excel 兼容策略（UTF-8 BOM + 文本单元格）
 * 3) 兼容不同页面的数据字段命名（camelCase / snake_case）
 */

// 固定导出列：作为全局标准
const EXPORT_HEADERS = [
  '预约ID',
  '教室',
  '预约日期',
  '开始时间',
  '结束时间',
  '节次',
  '活动名称',
  '活动类型',
  '参与人数',
  '用途说明',
  '状态',
  '提交时间'
]

// 将单元格内容转义为安全 CSV 文本
const escapeCsvCell = (value) => {
  const text = String(value ?? '')
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

// 以 Excel 文本格式输出，避免自动格式化导致 "####" 或编号失真
const toExcelText = (value) => {
  const text = String(value ?? '').replace(/"/g, '""')
  return `="${text}"`
}

// 兼容数组 / JSON 字符串的节次字段
const parsePeriodIds = (value) => {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

// 节次标准展示：第1节，第2节
const formatPeriods = (periodValue) => {
  const ids = parsePeriodIds(periodValue)
  if (!ids.length) return '—'
  return ids.map(id => `第${id}节`).join('，')
}

// 统一日期格式：YYYY-MM-DD
const formatDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// 统一日期时间格式：YYYY-MM-DD HH:mm
const formatDateTime = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// 时间字段兼容与规整：优先取 HH:mm:ss
const normalizeTime = (value) => String(value || '').slice(0, 8)

// 将任意结构的预约记录规范为统一导出行
const toExportRow = (record) => {
  const reservationId = record.reservationId ?? record.reservation_id ?? record.id ?? ''
  const classroomName = record.classroomName
    ?? record.classroom_name
    ?? (record.classroomId || record.classroom_id ? `教室ID：${record.classroomId || record.classroom_id}` : '')

  const reservationDate = formatDate(record.reservationDate ?? record.date)
  const startTime = normalizeTime(record.startTime ?? record.start_time)
  const endTime = normalizeTime(record.endTime ?? record.end_time)

  // 若已提供 periods 文本则优先使用；否则从 period_ids 解析
  const periods = record.periods || formatPeriods(record.periodIds ?? record.period_ids)

  const activityName = record.activityName ?? record.activity_name ?? ''
  const activityType = record.activityType ?? record.activity_type ?? ''
  const participantCount = record.participantCount ?? record.participant_count ?? ''
  const purpose = record.purpose ?? ''
  const status = record.status ?? ''

  const submittedAtText = formatDateTime(record.submittedAt ?? record.submitted_at)

  return [
    toExcelText(reservationId),
    classroomName,
    reservationDate,
    toExcelText(startTime),
    toExcelText(endTime),
    periods,
    activityName,
    activityType,
    participantCount,
    purpose,
    status,
    toExcelText(submittedAtText)
  ]
}

// 生成带时间戳的文件名
const buildFilename = (prefix) => {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  return `${prefix}_${stamp}.csv`
}

// 下载 CSV
const downloadCsv = (headers, rows, filename) => {
  const headerLine = headers.map(escapeCsvCell).join(',')
  const bodyLines = rows.map(row => row.map(escapeCsvCell).join(','))
  // UTF-8 BOM：保障 Windows Excel 打开中文不乱码
  const csvText = `\uFEFF${[headerLine, ...bodyLines].join('\n')}`

  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * 导出预约记录（统一入口）
 * @param {Array} records - 预约记录数组
 * @param {Object} options - 可选配置
 * @param {string} options.filenamePrefix - 导出文件名前缀
 * @returns {number} 导出的记录数
 */
export const exportReservationsCsv = (records = [], options = {}) => {
  if (!Array.isArray(records) || !records.length) return 0

  const rows = records.map(toExportRow)
  const filename = buildFilename(options.filenamePrefix || '我的预约')
  downloadCsv(EXPORT_HEADERS, rows, filename)
  return rows.length
}

// 暴露统一列定义，便于页面展示或测试比对
export const RESERVATION_EXPORT_HEADERS = EXPORT_HEADERS
