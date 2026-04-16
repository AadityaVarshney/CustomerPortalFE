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
    const { accessToken, refreshToken, user } = data.data  // unwrap nested `data`

    const roleMap = {
      'INTERNAL_ADMIN': '3sc_admin',
      'INTERNAL_AGENT': '3sc_agent',
      'INTERNAL_LEAD':  '3sc_lead',
      'CUSTOMER_ADMIN': 'customer_admin',
      'CUSTOMER_USER':  'customer_user',
    }

    const normalisedUser = { ...user, role: roleMap[user.role] ?? user.role }

    set({
      user: normalisedUser,
      role: normalisedUser.role,
      workspaceId: user.workspaceId,   // API returns `workspaceId` not `workspace_id`
      token: accessToken,
      refreshTokenValue: refreshToken,
      isLoading: false,
    })
    return { ...data.data, user: normalisedUser }
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
 