import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { SharedModule } from '../../shared.module';
import { TextHighlightPipe } from '../../pipes/text-highlight.pipe';
import { TableColumn } from '../../models/table-column';

@Component({
  selector: 'app-table-data',
  standalone: true,
  imports: [
    SharedModule,
    TextHighlightPipe
  ],
  templateUrl: './table-data.component.html',
  styleUrl: './table-data.component.css'
})
export class TableDataComponent<T> implements AfterViewInit {
  @ViewChild('tableContainer') tableContainer!: ElementRef<HTMLDivElement>;
  
  @Input() items: T[] = [];
  @Input() columns: TableColumn<T>[] = [];
  @Input() selectedItem: T | null = null;
  @Input() isLoading = false;
  @Input() hasNextPage = true;
  @Input() idField: string = 'id';  // Changed from keyof T to string
  @Input() searchTerm = '';
  
  @Output() selectItem = new EventEmitter<T>();
  @Output() loadMore = new EventEmitter<void>();

  private isLoadingMore = false;

  ngAfterViewInit() {
    this.tableContainer.nativeElement.addEventListener('scroll', this.handleScroll.bind(this));
  }

  selectRow(item: T): void {
    this.selectItem.emit(item);
  }

  getFieldValue(item: T, field: string | number | symbol): any {
    // Convert field to string to ensure it works with split()
    const fieldPath = String(field);
    // Handle nested properties (e.g., 'user.name')
    return fieldPath.split('.').reduce((obj: any, key) => obj && obj[key], item);
  }

  isEqual(item1: T | null, item2: T | null): boolean {
    if (!item1 || !item2 || !this.idField) return false;
    // Use getFieldValue instead of direct property access
    return this.getFieldValue(item1, this.idField) === this.getFieldValue(item2, this.idField);
  }

  private handleScroll(): void {
    if (this.isLoading || !this.hasNextPage || this.isLoadingMore) {
      return;
    }
    
    const element = this.tableContainer.nativeElement;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    
    const scrollThreshold = 200;
    const isNearBottom = scrollHeight - (scrollTop + clientHeight) < scrollThreshold;
    
    if (isNearBottom) {
      this.isLoadingMore = true;
      this.loadMore.emit();
      setTimeout(() => {
        this.isLoadingMore = false;
      }, 1000);
    }
  }

}
