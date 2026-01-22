// 教室控制器（后端示例：使用内存数据，后续可替换为数据库）

// 模拟教室数据
const classrooms = [
  {
    id: 1,
    name: 'A201 多媒体教室',
    brief: '配备投影仪、音响与录播设备，适用于教学与讲座。',
    mainImage: 'https://picsum.photos/seed/classroom1/800/600',
    images: [
      'https://picsum.photos/seed/classroom1/800/600',
      'https://picsum.photos/seed/classroom2/800/600',
      'https://picsum.photos/seed/classroom3/800/600'
    ],
    capacity: 80,
    location: '教学楼A-2层',
    status: 'available',
    detail: '<p>本教室为多媒体教学用房，配备高清投影、音响、白板和录播系统，适用于课程教学、公开课与学术讲座。</p>',
    params: [
      { key: '教室类型', value: '多媒体教室' },
      { key: '面积', value: '120㎡' },
      { key: '设备', value: '投影仪 / 录播 / 音响 / 空调' },
      { key: '插座', value: '每排配备电源插座' },
      { key: '网络', value: '校园网覆盖' }
    ],
    reviews: [
      {
        id: 1,
        userName: '张同学',
        userAvatar: 'https://picsum.photos/seed/user1/60/60',
        rating: 5,
        content: '设备齐全，环境很好，适合上机教学。',
        images: ['https://picsum.photos/seed/review1/120/120'],
        time: '2026-01-15'
      }
    ]
  },
  {
    id: 2,
    name: 'B301 物理实验室',
    brief: '实验台齐全，通风系统完善，适合实验课程。',
    mainImage: 'https://picsum.photos/seed/classroom4/800/600',
    images: [
      'https://picsum.photos/seed/classroom4/800/600',
      'https://picsum.photos/seed/classroom5/800/600'
    ],
    capacity: 40,
    location: '实验楼B-3层',
    status: 'occupied',
    detail: '<p>本实验室配备标准实验台与安全通风系统，适合物理实验课程开展。</p>',
    params: [
      { key: '教室类型', value: '实验室' },
      { key: '面积', value: '100㎡' },
      { key: '设备', value: '实验台 / 通风系统 / 投影仪' }
    ],
    reviews: []
  }
]

/**
 * 获取教室列表或单个教室
 * 支持：
 * - id：返回单个教室
 * - keyword：按名称/位置模糊筛选
 */
const getClassrooms = (req, res) => {
  const { id, keyword } = req.query

  // 如果传入 id，返回单个教室
  if (id) {
    const classroom = classrooms.find(item => String(item.id) === String(id))
    if (!classroom) {
      return res.status(404).json({ msg: '教室不存在' })
    }
    return res.json([classroom])
  }

  // 关键词筛选
  let result = classrooms
  if (keyword) {
    const key = String(keyword).toLowerCase()
    result = classrooms.filter(item =>
      item.name.toLowerCase().includes(key) ||
      item.location.toLowerCase().includes(key)
    )
  }

  res.json(result)
}

module.exports = {
  getClassrooms
}
