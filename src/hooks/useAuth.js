import { useAuthStore } from '@/stores/authStore'

export function useAuth() {
  const { user, role, token, isLoading, login, logout } = useAuthStore()

  const isAuthenticated = !!token && !!user
  const isCustomer = role === 'customer_admin' || role === 'customer_user'
  const isCustomerAdmin = role === 'customer_admin'
  const isInternal = role === '3sc_agent' || role === '3sc_lead' || role === '3sc_admin'
  const isInternalAdmin = role === '3sc_admin'

  return {
    user,
    role,
    token,
    isLoading,
    isAuthenticated,
    isCustomer,
    isCustomerAdmin,
    isInternal,
    isInternalAdmin,
    login,
    logout,
  }
}
