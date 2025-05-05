import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { SharedModule } from '../../../../shared/shared.module';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [
    SharedModule,
    FormsModule,
  ],
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.css'
})
export class SearchBarComponent {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @Input() isLoading = false;
  @Input() searchTerm = '';
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
