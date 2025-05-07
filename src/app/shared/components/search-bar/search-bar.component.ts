import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
  ],
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.css'
})
export class SearchBarComponent {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  
  @Input() isLoading = false;
  @Input() searchTerm = '';
  @Input() placeholder = 'Tìm kiếm...';
  
  @Output() search = new EventEmitter<string>();
  @Output() clear = new EventEmitter<void>();

  searchModel: string = '';

  onSearchChange(term: string): void {
    this.searchModel = term;
    this.search.emit(term);
  }

  clearSearch(): void {
    this.searchModel = '';
    this.clear.emit();
    setTimeout(() => this.searchInput.nativeElement.focus(), 0);
  }
}
