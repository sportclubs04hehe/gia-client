import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-form-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './form-footer.component.html',
  styleUrl: './form-footer.component.css'
})
export class FormFooterComponent {
  @Input() isSaving = false;
  @Input() disabled = false;
  @Input() saveText = 'Lưu';
  @Input() savingText = 'Đang lưu...';
  @Input() cancelText = 'Hủy';
  @Input() saveIcon = 'bi-floppy';
  @Input() savingIcon = 'bi-hourglass-split';
  @Input() cancelIcon = 'bi-x-circle me-1';
  @Input() submitType: 'button' | 'submit' = 'button';

  @Output() save = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  saveClicked(): void {
    if (this.submitType === 'button') {
      this.save.emit();
    }
  }

  cancelClicked(): void {
    this.cancel.emit();
  }
}
