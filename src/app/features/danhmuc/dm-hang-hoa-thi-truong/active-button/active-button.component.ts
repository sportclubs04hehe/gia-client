import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SharedModule } from '../../../../shared/shared.module';

@Component({
  selector: 'app-active-button',
  standalone: true,
  imports: [
    SharedModule
  ],
  templateUrl: './active-button.component.html',
  styleUrl: './active-button.component.css'
})
export class ActiveButtonComponent {
  @Input() isLoading = false;
  @Input() isSaving = false;
  @Input() hasSelected = false;
  
  @Output() add = new EventEmitter<void>();
  @Output() edit = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();
  @Output() importExcel = new EventEmitter<void>();
}
