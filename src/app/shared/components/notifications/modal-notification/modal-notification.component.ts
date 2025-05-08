import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { NotificationType } from '../../../models/notification-options';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal-notification',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './modal-notification.component.html',
  styleUrl: './modal-notification.component.css'
})
export class ModalNotificationComponent {
  @Input() title: string = 'Thông báo';
  @Input() message: string = '';
  @Input() type: NotificationType = 'info';
  @Input() confirmText: string = 'Xác nhận';
  @Input() cancelText: string = 'Hủy';
  @Input() showCancelButton: boolean = true;
  @Input() disableClose: boolean = false;
  
  constructor(public activeModal: NgbActiveModal) {}
  
  // Methods to handle different actions
  confirm(): void {
    this.activeModal.close(true);
  }
  
  cancel(): void {
    this.activeModal.dismiss(false);
  }
  
  // Helper method to get the icon class based on notification type
  getIconClass(): string {
    switch (this.type) {
      case 'success':
        return 'bi-check-circle-fill text-success';
      case 'warning':
        return 'bi bi-exclamation-triangle-fill text-warning';
      case 'danger':
        return 'bi-x-circle-fill text-danger';
      case 'info':
      default:
        return 'bi-info-circle-fill text-info';
    }
  }
  
  // Helper method to get header class based on notification type
  getHeaderClass(): string {
    return `modal-header bg-${this.type === 'danger' ? 'danger' : this.type} bg-opacity-10`;
  }
}
