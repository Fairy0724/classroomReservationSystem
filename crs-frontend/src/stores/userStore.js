import { defineStore } from 'pinia'
import request from '../utils/request'

export const useUserStore = defineStore('user', {
  state: () => ({
    userInfo: null,
    token: localStorage.getItem('token') || '',
    role: ''
  }),
  actions: {
    async login(username, password) {
      const res = await request.post('/api/user/login', { username, password })
      this.token = res.token
      this.userInfo = res.user
      this.role = res.user.role
      localStorage.setItem('token', res.token)
      return res
    },
    logout() {
      this.token = ''
      this.userInfo = null
      localStorage.removeItem('token')
    }
  }
})