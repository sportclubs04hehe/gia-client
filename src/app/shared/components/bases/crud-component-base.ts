import { Directive, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { SpinnerService } from '../../services/spinner.service';
import { ModalService } from '../../../features/danhmuc/services/utils/modal.service';

@Directive()
export abstract class CrudComponentBase<T> {
  protected toastr = inject(ToastrService);
  protected spinnerService = inject(SpinnerService);
  protected modalService = inject(ModalService);
  
  // Abstract methods that child classes must implement
  abstract getItemById(id: string): Observable<T>;
  abstract getEntityName(): string;
  abstract handleItemCreated(result: any): void;
  abstract handleItemUpdated(item: T, originalData?: any): void;
  abstract handleItemDeleted(item: T, additionalInfo?: any): void;
  
  /**
   * Mở modal thêm mới
   */
  openAddModal(component: any, options: any = {}, extraModalOptions = {}): void {
    const entityName = this.getEntityName();
    
    // Set default title if not provided
    if (!options.title) {
      options.title = `Thêm mới ${entityName}`;
    }
    
    this.modalService.openAddModal<T>(component, options, extraModalOptions)
      .subscribe(result => {
        if (!result?.success) return;
        this.toastr.success(`Thêm mới ${entityName} thành công`, 'Thông báo');
        this.handleItemCreated(result);
      });
  }
  
  /**
   * Mở modal chỉnh sửa
   */
  openEditModal(component: any, item: T, options: any = {}): void {
    const entityName = this.getEntityName();
    const originalData = {...item}; // Keep original for comparison
    
    // Set default title if not provided
    if (!options.title) {
      options.title = `Chỉnh sửa ${entityName}`;
    }
    
    this.modalService.openEditModal<T>(
      component,
      item,
      (id) => this.getItemById(String(id)),
      options
    ).subscribe(result => {
      if (result !== 'saved') return;
      
      this.spinnerService.showTableSpinner();
      const id = (item as any).id;
      
      this.getItemById(id).subscribe({
        next: (updatedItem) => {
          this.handleItemUpdated(updatedItem, originalData);
          this.toastr.success(`Cập nhật ${entityName} thành công`, 'Thông báo');
          this.spinnerService.hideTableSpinner();
        },
        error: (error) => {
          console.error(`Lỗi khi tải lại thông tin ${entityName} sau cập nhật:`, error);
          this.spinnerService.hideTableSpinner();
          this.toastr.error(`Không thể tải lại thông tin ${entityName}`, 'Lỗi');
        }
      });
    });
  }
  
  /**
   * Mở modal xác nhận xóa
   */
  openDeleteConfirmationModal(item: T, options: any = {}): void {
    const entityName = this.getEntityName();
    
    // Merge with default options
    const defaultOptions = {
      itemName: entityName
    };
    
    const finalOptions = {...defaultOptions, ...options};
    
    this.modalService.openDeleteConfirmationModal(finalOptions)
      .subscribe(confirmed => {
        if (confirmed) {
          this.deleteItem(item, options.isGroup || false);
        }
      });
  }
  
  /**
   * Xóa item (override in child classes for custom delete logic)
   */
  protected deleteItem(item: T, isGroup: boolean): void {
    // This should be implemented in derived classes
    console.warn('deleteItem() method should be implemented in the derived class');
    this.handleItemDeleted(item);
  }
}