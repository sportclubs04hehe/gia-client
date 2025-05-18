import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-active-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './active-button.component.html',
  styleUrls: ['./active-button.component.css']
})
export class ActiveButtonComponent {
  @Input() isLoading: boolean = false;
  @Input() isSaving: boolean = false;
  @Input() hasSelected: boolean = false;
  @Input() showRefreshButton: boolean = false; // Thêm input này
  
  @Output() buttonClick = new EventEmitter<string>();

  onButtonClick(action: string): void {
    this.buttonClick.emit(action);
  }
}
