export interface NotificationOptions {
    title?: string;
    message: string;
    type?: NotificationType;
    confirmText?: string;
    cancelText?: string;
    showCancelButton?: boolean;
    disableClose?: boolean;
    size?: 'sm' | 'lg' | 'xl' | string;
    centered?: boolean;
}
 
export type NotificationType = 'success' | 'warning' | 'danger' | 'info';