import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableColumn } from '../../models/table-column';

interface HasId {
  id: string;
  [key: string]: any; // Thêm index signature
}

@Component({
  selector: 'app-tree-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tree-table.component.html',
  styleUrls: ['./tree-table.component.css']
})
export class TreeTableComponent<T extends HasId> {
  @Input() items: T[] = [];
  @Input() columns: TableColumn<T>[] = [];
  @Input() selectedItem: T | null = null;
  @Input() isLoading = false;
  @Input() emptyMessage = 'Không có dữ liệu';

  @Output() selectItem = new EventEmitter<T>();
  @Output() toggleExpand = new EventEmitter<T>();

  onRowClick(item: T): void {
    this.selectItem.emit(item);
  }

  onExpandClick(item: T, event: Event): void {
    event.stopPropagation();
    this.toggleExpand.emit(item);
  }

  getDisplayValue(item: T, column: TableColumn<T>): string {
    if (column.formatter) {
      return column.formatter(item);
    }
    
    if (column.field) {
      const fieldName = column.field as string;
      const value = item[fieldName];
      return value !== undefined ? String(value) : '';
    }
    
    return '';
  }

  getButtonClass(item: T, column: TableColumn<T>): string {
    return column.buttonClass ? column.buttonClass(item) : 'btn btn-sm btn-outline-primary';
  }

  getButtonIcon(item: T, column: TableColumn<T>): string {
    return column.buttonIcon ? column.buttonIcon(item) : '';
  }
}
