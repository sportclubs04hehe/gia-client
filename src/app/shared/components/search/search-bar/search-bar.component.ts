import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
  @Input() isSearchActive = false; // Added new input
  @Input() placeholder = 'Tìm kiếm...';
  @Input() minLength = 1;
  @Input() searchDelay = 300;
  
  @Output() searchEvent = new EventEmitter<string>();
  @Output() clearEvent = new EventEmitter<void>();

  searchModel: string = '';
  private searchSubject = new Subject<string>();
  
  constructor() {
    // Use debounceTime to delay search until typing stops
    this.searchSubject.pipe(
      debounceTime(this.searchDelay),
      distinctUntilChanged(),
      takeUntilDestroyed()
    ).subscribe(term => {
      if (!term || term.length < this.minLength) return;
      this.searchEvent.emit(term);
    });
  }

  onSearchChange(term: string): void {
    this.searchModel = term;
    
    if (!term || term.trim().length === 0) {
      this.clearSearch();
      return;
    }
    
    // Use the subject to handle debouncing
    this.searchSubject.next(term);
  }

  clearSearch(): void {
    this.searchModel = '';
    this.clearEvent.emit();
    setTimeout(() => this.searchInput.nativeElement.focus(), 0);
  }
}
