import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/lib/axios'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      role: null,
      workspaceId: null,
      token: null,
      refreshTokenValue: null,
      isLoading: false,

      login: async (credentials) => {
        set({ isLoading: true })
        try {
          const { data } = await api.post('/auth/login', credentials)
          set({
            user: data.user,
            role: data.user.role,
            workspaceId: data.user.workspace_id,
            token: data.access_token,
            refreshTokenValue: data.refresh_token,
            isLoading: false,
          })
          return data
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: () => {
        set({
          user: null,
          role: null,
          workspaceId: null,
          token: null,
          refreshTokenValue: null,
        })
      },

      refreshToken: async () => {
        const refreshTokenValue = get().refreshTokenValue
        if (!refreshTokenValue) throw new Error('No refresh token')

        const { data } = await api.post('/auth/refresh', {
          refresh_token: refreshTokenValue,
        })

        set({
          token: data.access_token,
          refreshTokenValue: data.refresh_token ?? refreshTokenValue,
        })

        return data.access_token
      },

      updateUser: (updates) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        }))
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        role: state.role,
        workspaceId: state.workspaceId,
        token: state.token,
        refreshTokenValue: state.refreshTokenValue,
      }),
    },
  ),
)
