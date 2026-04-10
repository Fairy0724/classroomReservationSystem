// 审批结果通知服务：统一审批通知模板与落库逻辑

const formatDate = (value) => {
  if (!value) return '--';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatTime = (value) => {
  if (!value) return '--';
  const text = String(value);
  return text.length >= 5 ? text.slice(0, 5) : text;
};

const getReservationMessageContext = async (query, reservationId) => {
  const [rows] = await query(
    `SELECT
      r.reservation_id,
      r.applicant_id,
      r.date,
      r.start_time,
      r.end_time,
      r.activity_name,
      r.activity_type,
      r.participant_count,
      r.submitted_at,
      c.classroom_id,
      c.building,
      c.floor,
      c.room_num
     FROM reservation r
     LEFT JOIN classroom c ON c.classroom_id = r.classroom_id
     WHERE r.reservation_id = ?
     LIMIT 1`,
    [reservationId]
  );

  return rows[0] || null;
};

const getTeacherContact = async (query, teacherId) => {
  if (!teacherId) {
    return { teacherName: '审批教师', teacherContact: '暂无联系方式' };
  }

  const [rows] = await query(
    `SELECT
      t.teacher_id,
      t.name AS teacher_table_name,
      u.real_name,
      u.phone,
      u.email
     FROM teacher t
     LEFT JOIN user u ON u.user_id = t.user_id
     WHERE t.teacher_id = ?
     LIMIT 1`,
    [teacherId]
  );

  const row = rows[0] || {};
  const teacherName = row.real_name || row.teacher_table_name || `教师${teacherId}`;
  const teacherContact = row.phone || row.email || '暂无联系方式';
  return { teacherName, teacherContact };
};

// 发送审批结果通知
const sendApprovalNotification = async ({
  query,
  reservationId,
  teacherId,
  result,
  reason
}) => {
  if (!query || !reservationId) return;

  const context = await getReservationMessageContext(query, reservationId);
  if (!context || !context.applicant_id) return;

  const { teacherName, teacherContact } = await getTeacherContact(query, teacherId);

  const classroomName = `${context.building || ''}${context.room_num || ''}` || `教室${context.classroom_id || ''}`;
  const submitDateText = formatDate(context.submitted_at);
  const reservationDateText = formatDate(context.date);
  const startText = formatTime(context.start_time);
  const endText = formatTime(context.end_time);
  const activityNameText = context.activity_name || '活动';
  const activityTypeText = context.activity_type || '自习';
  const participantText = Number(context.participant_count || 0);

  let title = `您于 ${submitDateText} 提交的【${classroomName}】预约申请已通过审批。`;
  let content = `预约详情：${reservationDateText} ${startText}-${endText}，活动：${activityNameText}-${activityTypeText}，参与人数：${participantText}人。\n请按时使用教室，如需取消请至少提前2小时操作。\n如有疑问请联系审批教师：${teacherName}（${teacherContact}）。`;

  if (result === '驳回') {
    const reasonText = reason ? `，驳回理由：${reason}` : '';
    title = `您于 ${submitDateText} 提交的【${classroomName}】预约申请未通过审批。`;
    content = `预约详情：${reservationDateText} ${startText}-${endText}，活动：${activityNameText}-${activityTypeText}，参与人数：${participantText}人${reasonText}。\n如有疑问请联系审批教师：${teacherName}（${teacherContact}）。`;
  }

  await query(
    `INSERT INTO message (user_id, type, title, content, send_time, is_read)
     VALUES (?, ?, ?, ?, NOW(), 0)`,
    [context.applicant_id, 'approval', title, content]
  );
};

module.exports = {
  sendApprovalNotification
};
