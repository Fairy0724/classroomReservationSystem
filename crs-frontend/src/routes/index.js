import { createRouter, createWebHistory } from 'vue-router'
// 获取用户状态存储（与 App 共用同一 Pinia 实例）
import pinia from '@/stores/pinia'
import { useUserStore } from '@/stores/userStore'
const userStore = useUserStore(pinia)

// 懒加载页面
const Login = () => import('@/views/Login.vue')
const Layout = () => import('@/components/Layout.vue')
const Home = () => import('@/views/user/Home.vue')
const Admin = () => import('@/views/admin/Admin.vue')
const AdminClassroomList = () => import('@/views/admin/ClassroomList.vue')
const AdminCourseScheduleList = () => import('@/views/admin/CourseScheduleList.vue')
const AdminClassroomTypeList = () => import('@/views/admin/ClassroomTypeList.vue')
const AdminTeacherList = () => import('@/views/admin/TeacherList.vue')
const AdminStudentList = () => import('@/views/admin/StudentList.vue')
const AdminProfile = () => import('@/views/admin/AdminProfile.vue')
const AdminNoticeList = () => import('@/views/admin/NoticeList.vue')
const AdminReservationHistoryList = () => import('@/views/admin/ReservationHistoryList.vue')
const Classroom = () => import('@/views/user/Classroom.vue')
const ClassroomDetail = () => import('@/views/user/ClassroomDetail.vue')
const Reservation = () => import('@/views/user/Reservation.vue')
const MyReservations = () => import('@/views/user/MyReservations.vue')
const Approval = () => import('@/views/teacher/Approval.vue')
const ApprovalDetail = () => import('@/views/teacher/ApprovalDetail.vue')
const Placeholder = () => import('@/views/Placeholder.vue')
const Profile = () => import('@/views/user/Profile.vue')
const MessageCenter = () => import('@/views/user/MessageCenter.vue')
const MessageDetail = () => import('@/views/user/MessageDetail.vue')
const NoticeList = () => import('@/views/user/NoticeList.vue')
const NoticeDetail = () => import('@/views/user/NoticeDetail.vue')

const routes = [
  {
    path: '/',
    component: Layout,
    children: [
      {
        // 首页路由，默认跳转到home
        path: '',
        name: 'home',
        component: Home,
        meta: { keepAlive: false } // 首页不缓存，避免样式/模板更新被缓存
      },
      {
        // 教室列表页
        path: 'classrooms',
        name: 'classroomList',
        component: Classroom,
        meta: { keepAlive: true, requiresAuth: true }
      },
      {
        // 教室详情页
        path: 'classroom/:id',
        name: 'classroomDetail',
        component: ClassroomDetail,
        meta: { keepAlive: false, requiresAuth: true }
      },
      {
        // 教室预约页（从详情页进入）
        path: 'classroom/:id/reserve',
        name: 'classroomReserve',
        component: Reservation,
        meta: { requiresAuth: true, title: '提交预约申请' }
      },
      {
        // 我的预约（需要登录）
        path: 'my-reservations',
        name: 'myReservations',
        component: MyReservations,
        meta: { requiresAuth: true, title: '我的预约' }
      },
      {
        // 教师审批（需要登录）
        path: 'approval',
        name: 'approval',
        component: Approval,
        meta: { requiresAuth: true, title: '审批管理' }
      },
      {
        // 审批详情
        path: 'approval/:id',
        name: 'approvalDetail',
        component: ApprovalDetail,
        meta: { requiresAuth: true, title: '审批详情' }
      },
      {
        // 教师课程（需要登录）
        path: 'my-courses',
        name: 'myCourses',
        component: Placeholder,
        meta: { requiresAuth: true, title: '我的课程' }
      },
      {
        // 课程表（需要登录）
        path: 'schedule',
        name: 'schedule',
        component: Placeholder,
        meta: { requiresAuth: true, title: '课程表' }
      },
      {
        // 系统公告
        path: 'notice',
        name: 'notice',
        component: NoticeList,
        meta: { keepAlive: true, title: '系统公告' }
      },
      {
        // 公告详情
        path: 'notice/:id',
        name: 'noticeDetail',
        component: NoticeDetail,
        meta: { keepAlive: false, title: '公告详情' }
      },
      {
        // 使用帮助
        path: 'help',
        name: 'help',
        component: Placeholder,
        meta: { keepAlive: true, title: '使用帮助' }
      },
      {
        // 个人中心
        path: 'profile',
        name: 'profile',
        component: Profile,
        meta: { requiresAuth: true, title: '个人中心' }
      },
      {
        // 消息通知
        path: 'messages',
        name: 'messageCenter',
        component: MessageCenter,
        meta: { requiresAuth: true, title: '消息通知' }
      },
      {
        // 消息详情
        path: 'messages/:id',
        name: 'messageDetail',
        component: MessageDetail,
        meta: { requiresAuth: true, title: '消息详情' }
      },
      {
        // 账号设置
        path: 'settings',
        name: 'settings',
        component: Placeholder,
        meta: { requiresAuth: true, title: '账号设置' }
      },
      {
        // 管理员后台首页
        path: 'admin',
        name: 'admin',
        component: Admin,
        meta: { keepAlive: true, isAdmin: true, requiresAuth: true },// 管理员页需要缓存
        // 管理员子路由
        children: [
          {
            // 管理员：教室管理
            path: 'classroom',
            name: 'adminClassroom',
            component: AdminClassroomList,
            meta: { keepAlive: false, isAdmin: true, requiresAuth: true }
          },
          {
            // 管理员：课程管理
            path: 'course-schedule',
            name: 'adminCourseSchedule',
            component: AdminCourseScheduleList,
            meta: { keepAlive: false, isAdmin: true, requiresAuth: true }
          },
          {
            // 管理员：教室类型管理
            path: 'classroom-type',
            name: 'adminClassroomType',
            component: AdminClassroomTypeList,
            meta: { keepAlive: false, isAdmin: true, requiresAuth: true }
          },
          {
            // 管理员：教师信息
            path: 'teachers',
            name: 'adminTeachers',
            component: AdminTeacherList,
            meta: { keepAlive: false, isAdmin: true, requiresAuth: true }
          },
          {
            // 管理员：学生信息
            path: 'students',
            name: 'adminStudents',
            component: AdminStudentList,
            meta: { keepAlive: false, isAdmin: true, requiresAuth: true }
          },
          {
            // 管理员：个人信息
            path: 'profile',
            name: 'adminProfile',
            component: AdminProfile,
            meta: { keepAlive: false, isAdmin: true, requiresAuth: true }
          },
          {
            // 管理员：系统公告
            path: 'notice',
            name: 'adminNotice',
            component: AdminNoticeList,
            meta: { keepAlive: false, isAdmin: true, requiresAuth: true }
          },
          {
            // 管理员：历史预约管理（只读）
            path: 'reservation-history',
            name: 'adminReservationHistory',
            component: AdminReservationHistoryList,
            meta: { keepAlive: false, isAdmin: true, requiresAuth: true }
          },
        ]
      }

    ]

  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { keepAlive: false } // 登录页不需要缓存
  }
]
// 使用history模式（无#号URL，无页面刷新）
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL), // Vite环境变量写法
  routes
})

// 路由拦截逻辑与之前一致
router.beforeEach(async (to, from, next) => {
  const hasToken = !!localStorage.getItem('token')
  const needsAuth = !!to.meta.requiresAuth

  // 仅在需要登录的路由中拉取角色信息，避免公共页触发 401
  if (hasToken && !userStore.role && needsAuth) {
    try {
      await userStore.fetchProfile()
    } catch {
      userStore.logout()
    }
  }

  // 管理员账号：只允许进入 /admin 下页面（以及登录页）
  if (userStore.role === 'admin' && !to.path.startsWith('/admin') && to.path !== '/login') {
    next('/admin');
    return;
  }
  // 检查当前路由是否需要登录权限
  if (needsAuth) {
    // 检查是否有 token
    if (!localStorage.getItem('token')) {
      next('/login'); // 无 token 跳转到登录页
    }
    // 检查是否需要管理员权限（仅当路由要求且用户不是管理员时拦截）
    else if (to.meta.isAdmin && userStore.role !== 'admin') {
      next('/'); // 非管理员跳转到首页
    }
    // 有权限，正常放行
    else {
      next();
    }
  }
  // 不需要权限的路由，直接放行
  else {
    next();
  }
});

export default router