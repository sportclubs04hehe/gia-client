import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { SharedModule } from '../../../shared.module';
import { TextHighlightPipe } from '../../../pipes/text-highlight.pipe';
import { TableColumn } from '../../../models/table-column';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';

@Component({
  selector: 'app-table-data',
  standalone: true,
  imports: [
    SharedModule,
    TextHighlightPipe,
    InfiniteScrollModule
  ],
  templateUrl: './table-data.component.html',
  styleUrl: './table-data.component.css'
})
export class TableDataComponent<T> {
  @ViewChild('tableContainer') tableContainer!: ElementRef<HTMLDivElement>;
  
  @Input() items: T[] = [];
  @Input() columns: TableColumn<T>[] = [];
  @Input() selectedItem: T | null = null;
  @Input() isLoading = false;
  @Input() hasNextPage = true;
  @Input() idField: string = 'id';
  @Input() searchTerm = '';
  
  @Output() selectItem = new EventEmitter<T>();
  @Output() loadMore = new EventEmitter<void>();

  selectRow(item: T): void {
    this.selectItem.emit(item);
  }

  getFieldValue(item: T, field: string | number | symbol): any {
    const fieldPath = String(field);
    return fieldPath.split('.').reduce((obj: any, key) => obj && obj[key], item);
  }

  isEqual(item1: T | null, item2: T | null): boolean {
    if (!item1 || !item2 || !this.idField) return false;
    return this.getFieldValue(item1, this.idField) === this.getFieldValue(item2, this.idField);
  }

  onScrollDown(): void {
    if (!this.isLoading && this.hasNextPage) {
      this.loadMore.emit();
    }
  }
}
