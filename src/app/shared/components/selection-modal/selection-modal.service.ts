import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Observable, from } from 'rxjs';
import { SelectionModalOptions } from '../../models/selection-modal-options';
import { SelectionModalComponent } from './selection-modal.component';

@Injectable({
  providedIn: 'root'
})
export class SelectionModalService {
  constructor(private modalService: NgbModal) {}

  open<T>(options: SelectionModalOptions<T>): Observable<T | null> {
    const modalRef = this.modalService.open(SelectionModalComponent, { 
      centered: true,
    });
    
    const component = modalRef.componentInstance as SelectionModalComponent;
    
    // Set inputs
    component.title = options.title;
    component.items = options.items;
    component.columns = options.columns;
    component.idField = options.idField || 'id';
    component.searchable = options.searchable !== undefined ? options.searchable : true;
    component.searchPlaceholder = options.searchPlaceholder || 'Tìm kiếm...';
    component.noDataMessage = options.noDataMessage || 'Không có dữ liệu';
    component.loadingMessage = options.loadingMessage || 'Đang tải...';
    component.selectedId = options.selectedId || null;
    
    // Set up event handlers
    if (options.searchFn) {
      component.search.subscribe(term => options.searchFn!(term));
    }
    
    if (options.clearSearchFn) {
      component.clearSearch.subscribe(() => options.clearSearchFn!());
    }
    
    // Return an observable that resolves when the modal is closed
    return from(modalRef.result.catch(() => null));
  }

  openWithRef<T>(options: SelectionModalOptions<T>): any {
    const modalRef = this.modalService.open(SelectionModalComponent, { 
      centered: true,
    });
    
    const component = modalRef.componentInstance as SelectionModalComponent;
    
    // Set inputs
    component.title = options.title;
    component.items = options.items;
    component.columns = options.columns;
    component.idField = options.idField || 'id';
    component.searchable = options.searchable !== undefined ? options.searchable : true;
    component.searchPlaceholder = options.searchPlaceholder || 'Tìm kiếm...';
    component.noDataMessage = options.noDataMessage || 'Không có dữ liệu';
    component.loadingMessage = options.loadingMessage || 'Đang tải...';
    component.selectedId = options.selectedId || null;
    
    // Set up event handlers
    if (options.searchFn) {
      component.search.subscribe(term => options.searchFn!(term));
    }
    
    if (options.clearSearchFn) {
      component.clearSearch.subscribe(() => options.clearSearchFn!());
    }
    
    // Return the modal reference directly
    return modalRef;
  }

  // Helper method to mark the modal as loading/not loading
  setLoading(modalRef: any, loading: boolean): void {
    const component = modalRef.componentInstance as SelectionModalComponent;
    component.setLoading(loading);
  }
}
