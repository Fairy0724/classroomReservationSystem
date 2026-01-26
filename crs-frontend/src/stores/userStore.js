import { defineStore } from 'pinia'
import request from '../utils/request'

// 规范化用户信息字段
const normalizeUser = (user) => {
  if (!user) return user
  return {
    ...user,
    avatar: user.avatar ?? user.avatar_url,
    realName: user.realName ?? user.real_name,
    studentNo: user.studentNo ?? user.student_no,
    jobNo: user.jobNo ?? user.job_no,
    createTime: user.createTime ?? user.create_time
  }
}

export const useUserStore = defineStore('user', {
  state: () => ({
    userInfo: null,
    token: localStorage.getItem('token') || '',
    role: ''
  }),
  actions: {
    async login(username, password) {
      const res = await request.post('/user/login', { username, password })
      // 登录成功后，将token存储到localStorage
      this.token = res.token
      // 存储用户信息
      this.userInfo = normalizeUser(res.user)
      // 角色
      this.role = res.user.role
      // 真实姓名
      this.realName = this.userInfo?.realName 
      localStorage.setItem('token', res.token)
      return res
    },
    async fetchProfile() {
      const res = await request.get('/user/profile')
      this.userInfo = normalizeUser(res.user)
      this.role = this.userInfo?.role || ''
      return res
    },
    async updateProfile(payload) {
      const res = await request.put('/user/profile', payload)
      this.userInfo = normalizeUser(res.user)
      this.role = this.userInfo?.role || ''
      return res
    },
    async changePassword(oldPwd, newPwd) {
      return request.put('/user/password', { oldPwd, newPwd })
    },
    async updatePhone(newPhone) {
      const res = await request.put('/user/phone', { newPhone })
      this.userInfo = normalizeUser(res.user)
      return res
    },
    logout() {
      this.token = ''
      this.userInfo = null
      localStorage.removeItem('token')
    }
  }
})