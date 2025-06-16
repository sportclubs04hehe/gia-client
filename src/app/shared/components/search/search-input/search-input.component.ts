import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="search-wrapper">
      <div class="position-relative w-100">
        <!-- Search icon -->
        <i class="bi bi-search text-muted position-absolute top-50 start-0 translate-middle-y ps-3"></i>
        
        <input 
          type="text" 
          class="form-control ps-5 pe-5" 
          [placeholder]="placeholder" 
          [ngModel]="searchTerm" 
          #searchInput
          (input)="onSearch(searchInput.value)">
        
        <!-- Clear button inside input -->
        <button 
          *ngIf="searchTerm" 
          type="button" 
          class="btn btn-sm position-absolute top-50 end-0 translate-middle-y me-2 p-0 border-0 bg-transparent text-muted"
          (click)="onClear()">
          <i class="bi bi-x-circle-fill fs-5"></i>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .search-wrapper {
      position: relative;
      width: 300px;
    }

    .search-wrapper .form-control:focus {
      box-shadow: 0 0 0 0.2rem rgba(52, 152, 219, 0.25);
    }
  `]
})
export class SearchInputComponent {
  @Input() searchTerm: string = '';
  @Input() placeholder: string = 'Tìm kiếm...';
  
  @Output() search = new EventEmitter<string>();
  @Output() clear = new EventEmitter<void>();
  
  onSearch(term: string): void {
    this.search.emit(term);
  }
  
  onClear(): void {
    this.clear.emit();
  }
}