import { Toast } from "@base-ui/react/toast";

export const toastManager = Toast.createToastManager();

type ToastType = "success" | "error" | "info";

// Backward-compatible interface for useApi.ts and apiFetch.ts
export const useToastStore = {
  getState: () => ({
    addToast(message: string, type: ToastType = "info") {
      toastManager.add({ title: message, type, timeout: 3500 });
    },
  }),
};
