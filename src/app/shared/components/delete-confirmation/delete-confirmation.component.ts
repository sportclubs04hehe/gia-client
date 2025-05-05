import { Component, inject, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '../../shared.module';

@Component({
  selector: 'app-delete-confirmation',
  standalone: true,
  imports: [
    SharedModule,
  ],
  templateUrl: './delete-confirmation.component.html',
  styleUrl: './delete-confirmation.component.css'
})
export class DeleteConfirmationComponent {
  @Input() title: string = 'Xác nhận xóa';
  @Input() message: string = 'Bạn có chắc chắn muốn xóa mục này không?';
  @Input() itemName?: string;

  activeModal = inject(NgbActiveModal);

  confirm(): void {
    this.activeModal.close(true);
  }
}
