import { X, CheckCircle, WarningCircle, Info } from "@phosphor-icons/react";
import { Toast } from "@base-ui/react/toast";

const TypeIcon = ({ type }: { type: string | undefined }) => {
  if (type === "success") return <CheckCircle size={16} weight="fill" className="shrink-0" />;
  if (type === "error") return <WarningCircle size={16} weight="fill" className="shrink-0" />;
  return <Info size={16} weight="fill" className="shrink-0" />;
};

export default function ToastList() {
  const { toasts } = Toast.useToastManager();

  return (
    <Toast.Viewport className="fixed bottom-24 left-0 right-0 flex flex-col gap-2 px-4 z-50 max-w-[430px] mx-auto pointer-events-none">
      {toasts.map((toast) => (
        <Toast.Root
          key={toast.id}
          toast={toast}
          className={`card-panel flex items-center justify-between gap-3 px-4 py-3 rounded-xl animate-slide-up pointer-events-auto ${
            toast.type === "error"
              ? "border-app-red/30 text-app-red"
              : toast.type === "success"
                ? "border-app-green/30 text-app-green"
                : "border-app-accent/20 text-app-text"
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <TypeIcon type={toast.type} />
            <Toast.Title className="text-sm font-medium">{toast.title}</Toast.Title>
          </div>
          <Toast.Close
            aria-label="Dismiss"
            className="text-app-text-muted hover:text-app-text transition-colors shrink-0"
          >
            <X size={14} />
          </Toast.Close>
        </Toast.Root>
      ))}
    </Toast.Viewport>
  );
}
