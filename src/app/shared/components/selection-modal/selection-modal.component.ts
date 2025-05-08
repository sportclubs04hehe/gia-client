import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TextHighlightPipe } from '../../pipes/text-highlight.pipe';
import { TruncatePipe } from '../../pipes/truncate.pipe';
import { SearchBarComponent } from '../search-bar/search-bar.component';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { TableColumn } from '../../models/table-column';

@Component({
  selector: 'app-selection-modal',
  standalone: true,
  imports: [
    CommonModule,
    SearchBarComponent,
    TextHighlightPipe,
    TruncatePipe
  ],
  templateUrl: './selection-modal.component.html',
  styleUrl: './selection-modal.component.css'
})
export class SelectionModalComponent {
  @Input() title: string = 'Select Item';
  @Input() items: any[] = [];
  @Input() columns: TableColumn<any>[] = [];
  @Input() idField: string = 'id';
  @Input() searchable: boolean = true;
  @Input() searchPlaceholder: string = 'Search...';
  @Input() noDataMessage: string = 'No data available';
  @Input() loadingMessage: string = 'Loading...';
  @Input() selectedId: string | null = null;
  
  @Output() search = new EventEmitter<string>();
  @Output() clearSearch = new EventEmitter<void>();
  
  searchTerm: string = '';
  tempSelectedItem: any = null;
  isLoading: boolean = false;
  
  private searchTerms = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(public activeModal: NgbActiveModal) {}

  ngOnInit(): void {
    if (this.selectedId) {
      this.tempSelectedItem = this.items.find(item => item[this.idField] === this.selectedId);
    }
    
    this.searchTerms.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(term => {
      this.search.emit(term);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearch(term: string): void {
    this.searchTerms.next(term);
  }

  onClearSearch(): void {
    this.searchTerm = '';
    this.clearSearch.emit();
  }

  selectItem(item: any): void {
    this.tempSelectedItem = item;
  }

  confirm(): void {
    this.activeModal.close(this.tempSelectedItem);
  }

  dismiss(): void {
    this.activeModal.dismiss();
  }

  setLoading(status: boolean): void {
    this.isLoading = status;
  }

  getFieldValue(item: any, field: string): any {
    return item[field];
  }
}
