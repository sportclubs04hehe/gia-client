import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Observable, from } from 'rxjs';
import { ModalNotificationComponent } from './modal-notification.component';
import { NotificationOptions } from '../../../models/notification-options';

@Injectable({
  providedIn: 'root'
})
export class ModalNotificationService {
  constructor(private modalService: NgbModal) {}
  
  /**
   * Show a notification modal with customizable options
   * @returns Observable that resolves to true when confirmed, false when dismissed
   */
  show(options: NotificationOptions): Observable<boolean> {
    const modalRef = this.modalService.open(ModalNotificationComponent, {
      centered: options.centered ?? true,
      size: options.size ?? 'md',
      backdrop: options.disableClose ? 'static' : true,
      keyboard: !options.disableClose
    });
    
    const component = modalRef.componentInstance;
    
    // Configure the modal
    if (options.title) component.title = options.title;
    component.message = options.message;
    if (options.type) component.type = options.type;
    if (options.confirmText) component.confirmText = options.confirmText;
    if (options.cancelText) component.cancelText = options.cancelText;
    if (options.showCancelButton !== undefined) component.showCancelButton = options.showCancelButton;
    if (options.disableClose !== undefined) component.disableClose = options.disableClose;
    
    // Return an observable that resolves to true when confirmed, false when canceled
    return from(modalRef.result.then(() => true).catch(() => false));
  }
  
  /**
   * Show a success notification
   */
  success(message: string, title: string = 'Thành công'): Observable<boolean> {
    return this.show({
      title,
      message,
      type: 'success',
      showCancelButton: false
    });
  }
  
  /**
   * Show a warning notification
   */
  warning(message: string, title: string = 'Cảnh báo'): Observable<boolean> {
    return this.show({
      title,
      message,
      type: 'warning'
    });
  }
  
  /**
   * Show a danger/error notification
   */
  error(message: string, title: string = 'Lỗi'): Observable<boolean> {
    return this.show({
      title,
      message,
      type: 'danger'
    });
  }
  
  /**
   * Show an info notification
   */
  info(message: string, title: string = 'Thông tin'): Observable<boolean> {
    return this.show({
      title,
      message,
      type: 'info'
    });
  }
  
  /**
   * Show a confirmation dialog
   */
  confirm(message: string, title: string = 'Xác nhận'): Observable<boolean> {
    return this.show({
      title,
      message,
      type: 'warning',
      confirmText: 'Xác nhận',
      cancelText: 'Hủy'
    });
  }
  
  /**
   * Show a deletion confirmation dialog
   */
  confirmDelete(message: string = 'Bạn có chắc chắn muốn xóa mục này không?'): Observable<boolean> {
    return this.show({
      title: 'Xác nhận xóa',
      message,
      type: 'danger',
      confirmText: 'Xóa',
      cancelText: 'Hủy'
    });
  }
}
