import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ActionButton } from '../../models/active-buton';

@Component({
  selector: 'app-active-button',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './active-button.component.html',
  styleUrl: './active-button.component.css'
})
export class ActiveButtonComponent {
  @Input() isLoading = false;
  @Input() isSaving = false;
  @Input() hasSelected = false;
  @Input() buttons: ActionButton[] = [
    { action: 'add', label: 'Thêm', icon: 'bi-plus-circle', class: 'btn-success', visible: true },
    { action: 'edit', label: 'Sửa', icon: 'bi-pencil', class: 'btn-primary', requiresSelection: true, visible: true },
    { action: 'delete', label: 'Xóa', icon: 'bi-trash', class: 'btn-danger', requiresSelection: true, visible: true },
    { action: 'import', label: 'Nhập Excel', icon: 'bi-file-earmark-excel', class: 'btn-info', visible: true }
  ];
  
  @Output() buttonClick = new EventEmitter<string>();

  onClick(action: string): void {
    this.buttonClick.emit(action);
  }

  isButtonDisabled(button: ActionButton): boolean {
    if (this.isLoading || this.isSaving) return true;
    if (button.requiresSelection && !this.hasSelected) return true;
    return false;
  }
}
