// 预约控制器（后端示例：使用内存数据，后续可替换为数据库）

let reservationId = 1000;
const reservations = [];

/**
 * 提交预约申请
 * body: {
 *   classroomId, userId, role,
 *   date, timeSlots[], attendeeCount,
 *   activityName, purpose, purposeType
 * }
 */
const createReservation = (req, res) => {
  const {
    classroomId,
    userId,
    role,
    date,
    timeSlots,
    attendeeCount,
    activityName,
    purpose,
    purposeType
  } = req.body || {};

  // 1. 基础必填校验
  if (!classroomId || !userId || !date || !timeSlots || !attendeeCount || !activityName || !purpose) {
    return res.status(400).json({ msg: '参数不完整' });
  }

  // 2. 日期校验（未来30天内）
  const selectedDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 30);
  if (selectedDate < today || selectedDate > maxDate) {
    return res.status(400).json({ msg: '请选择未来一月的有效日期' });
  }

  // 3. 人数校验
  if (Number(attendeeCount) <= 0) {
    return res.status(400).json({ msg: '参与人数请输入正整数' });
  }

  // 4. 时段校验
  const slotList = Array.isArray(timeSlots) ? timeSlots : [timeSlots];
  if (slotList.length === 0) {
    return res.status(400).json({ msg: '请选择预约时段' });
  }

  // 5. 冲突检测（同教室、同日期、同一时段已存在记录）
  const conflict = reservations.find(item =>
    String(item.classroomId) === String(classroomId) &&
    String(item.date) === String(date) &&
    item.timeSlots.some(slot => slotList.includes(slot)) &&
    ['pending', 'approved'].includes(item.status)
  );
  if (conflict) {
    return res.status(409).json({ msg: '该时段已被占用' });
  }

  // 6. 状态规则：教师教学申请直接通过
  const isTeaching = String(purposeType) === 'teaching';
  const status = role === 'teacher' && isTeaching ? 'approved' : 'pending';

  const record = {
    id: reservationId++,
    classroomId,
    userId,
    role: role || 'student',
    date,
    timeSlots: slotList,
    attendeeCount: Number(attendeeCount),
    activityName,
    purpose,
    purposeType: purposeType || 'nonTeaching',
    status,
    createdAt: new Date().toISOString()
  };

  reservations.push(record);

  res.json({ msg: '预约申请已提交', data: record });
};

/**
 * 获取当前用户的预约记录
 * 需要鉴权，从 token 获取 user_id
 */
const getMyReservations = (req, res) => {
  const userId = req.user.user_id;
  const list = reservations.filter(item => String(item.userId) === String(userId));
  res.json({ data: list });
};

module.exports = {
  createReservation,
  getMyReservations
};
