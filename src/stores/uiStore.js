import { create } from 'zustand'

let toastId = 0

export const useUIStore = create((set) => ({
  sidebarOpen: true,
  activeDrawer: null,
  toasts: [],

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  openDrawer: (drawer) => set({ activeDrawer: drawer }),
  closeDrawer: () => set({ activeDrawer: null }),

  addToast: ({ type = 'info', title, description, duration = 5000 }) => {
    const id = ++toastId
    set((s) => ({
      toasts: [...s.toasts, { id, type, title, description, duration }],
    }))
    if (duration > 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
      }, duration)
    }
    return id
  },

  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },
}))
