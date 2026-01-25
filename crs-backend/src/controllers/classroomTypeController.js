/**
 * 教室类型管理控制器（示例：内存数据结构）
 * 说明：
 * 1. 该模块独立于教室管理，便于后续替换为数据库实现。
 * 2. 保持 REST 风格：GET/POST/PUT/DELETE。
 */

// ==================== 内存数据（可替换为数据库） ====================
let typeIdSeed = 3;
const classroomTypes = [
  {
    id: 1,
    typeName: '普通教室',
    description: '标准教学用房，适合一般教学与自习',
    status: 'enabled',
    createdAt: '2026-01-01 10:00:00'
  },
  {
    id: 2,
    typeName: '多媒体教室',
    description: '配备投影与音响设备',
    status: 'enabled',
    createdAt: '2026-01-01 10:00:00'
  }
];

// ==================== 工具函数 ====================
const normalizeStatus = (value) => {
  if (value === 'disabled' || value === 'enabled') return value;
  return 'enabled';
};

/**
 * 获取教室类型列表（支持分页/关键词）
 * query: keyword, page, pageSize
 */
const listClassroomTypes = (req, res) => {
  const { keyword } = req.query;
  const page = Number(req.query.page || 1);
  const pageSize = Number(req.query.pageSize || 10);

  // 关键词过滤
  let result = classroomTypes;
  if (keyword) {
    const key = String(keyword).toLowerCase();
    result = result.filter(item =>
      item.typeName.toLowerCase().includes(key) ||
      (item.description || '').toLowerCase().includes(key)
    );
  }

  // 分页处理
  const total = result.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const pageData = result.slice(start, end);

  res.json({
    data: pageData,
    pagination: { page, pageSize, total }
  });
};

/**
 * 新增教室类型（管理员）
 */
const createClassroomType = (req, res) => {
  const { typeName, description, status } = req.body || {};
  if (!typeName) {
    return res.status(400).json({ msg: '类型名称不能为空' });
  }

  // 唯一性校验
  const exists = classroomTypes.some(item => item.typeName === typeName);
  if (exists) {
    return res.status(409).json({ msg: '类型名称已存在' });
  }

  const record = {
    id: typeIdSeed++,
    typeName,
    description: description || '',
    status: normalizeStatus(status),
    createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
  };

  classroomTypes.push(record);
  res.json({ msg: '新增成功', data: record });
};

/**
 * 更新教室类型（管理员）
 */
const updateClassroomType = (req, res) => {
  const { id } = req.params;
  const index = classroomTypes.findIndex(item => String(item.id) === String(id));
  if (index === -1) {
    return res.status(404).json({ msg: '教室类型不存在' });
  }

  const { typeName, description, status } = req.body || {};

  // 名称唯一性校验
  if (typeName && classroomTypes.some(item => item.typeName === typeName && String(item.id) !== String(id))) {
    return res.status(409).json({ msg: '类型名称已存在' });
  }

  const current = classroomTypes[index];
  classroomTypes[index] = {
    ...current,
    typeName: typeName !== undefined ? typeName : current.typeName,
    description: description !== undefined ? description : current.description,
    status: status !== undefined ? normalizeStatus(status) : current.status
  };

  res.json({ msg: '更新成功', data: classroomTypes[index] });
};

/**
 * 删除教室类型（管理员）
 */
const deleteClassroomType = (req, res) => {
  const { id } = req.params;
  const index = classroomTypes.findIndex(item => String(item.id) === String(id));
  if (index === -1) {
    return res.status(404).json({ msg: '教室类型不存在' });
  }

  const [removed] = classroomTypes.splice(index, 1);
  res.json({ msg: '删除成功', data: removed });
};

module.exports = {
  listClassroomTypes,
  createClassroomType,
  updateClassroomType,
  deleteClassroomType
};
