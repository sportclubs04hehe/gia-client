import { Injectable, inject } from '@angular/core';
import { NgbModal, NgbModalOptions, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { Observable, catchError, from, map, of, switchMap } from 'rxjs';
import { SpinnerService } from '../../../../shared/services/spinner.service';
import { DeleteConfirmationComponent } from '../../../../shared/components/notifications/delete-confirmation/delete-confirmation.component';

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private modalService = inject(NgbModal);
  private toastr = inject(ToastrService);
  private spinnerService = inject(SpinnerService);

  /**
   * Mở modal thêm mới dữ liệu
   * @param component Component để hiển thị trong modal
   * @param options Cấu hình cho modal
   * @param data Dữ liệu truyền vào modal
   * @returns Observable kết quả từ modal
   */
  openAddModal<T, R = any>(
    component: any, 
    options: {
      title?: string,
      size?: 'sm' | 'lg' | 'xl',
      data?: any
    } = {},
    extraModalOptions: NgbModalOptions = {}
  ): Observable<R | null> {
    const modalOptions: NgbModalOptions = {
      size: options.size || 'lg',
      backdrop: 'static',
      keyboard: false,
      ...extraModalOptions
    };

    const modalRef = this.modalService.open(component, modalOptions);
    
    // Truyền dữ liệu vào modal
    if (options.title) {
      modalRef.componentInstance.title = options.title;
    }
    
    // Truyền thêm dữ liệu nếu có
    if (options.data) {
      Object.keys(options.data).forEach(key => {
        modalRef.componentInstance[key] = options.data[key];
      });
    }

    // Trả về observable để component gọi xử lý kết quả
    return from(modalRef.result).pipe(
      catchError(err => {
        // Bắt lỗi khi modal bị đóng không thành công
        return of(null);
      })
    );
  }

  /**
   * Mở modal chỉnh sửa dữ liệu
   * @param component Component để hiển thị trong modal
   * @param item Dữ liệu cần chỉnh sửa
   * @param getItemFn Hàm để lấy thông tin chi tiết trước khi mở modal
   * @param options Cấu hình cho modal
   * @returns Observable kết quả từ modal
   */
  openEditModal<T, R = string>(
    component: any,
    item: T,
    getItemFn: (id: string | number) => Observable<T>,
    options: {
      title?: string,
      size?: 'sm' | 'lg' | 'xl',
      itemKey?: string,
      idField?: string
    } = {}
  ): Observable<R | null> {
    this.spinnerService.showSavingSpinner();
    
    const itemKey = options.itemKey || 'editingItem';
    const idField = options.idField || 'id';
    const id = (item as any)[idField];
    
    return getItemFn(id).pipe(
      switchMap(fullItemData => {
        const modalRef = this.modalService.open(component, {
          size: options.size || 'lg',
          backdrop: 'static',
          keyboard: false
        });
        
        // Truyền dữ liệu vào modal
        modalRef.componentInstance[itemKey] = fullItemData;
        
        if (options.title) {
          modalRef.componentInstance.title = options.title;
        }
        
        this.spinnerService.hideSavingSpinner();
        
        return from(modalRef.result).pipe(
          catchError(err => {
            return of(null);
          })
        );
      }),
      catchError(error => {
        console.error('Lỗi khi tải dữ liệu chi tiết:', error);
        this.spinnerService.hideSavingSpinner();
        this.toastr.error('Không thể tải thông tin chi tiết', 'Lỗi');
        return of(null);
      })
    );
  }

  /**
   * Mở modal xác nhận xóa
   * @param options Tùy chọn cho modal xóa
   * @returns Observable<boolean> kết quả xác nhận
   */
  openDeleteConfirmationModal(
    options: {
      title?: string,
      message?: string,
      isGroup?: boolean,
      groupItemName?: string,
      itemName?: string
    } = {}
  ): Observable<boolean> {
    // Thiết lập tiêu đề và thông báo phù hợp
    const itemName = options.itemName || 'mục';
    const groupItemName = options.groupItemName || 'nhóm';
    
    let title = options.title || `Xác nhận xóa ${itemName}`;
    let message = options.message || `Bạn có chắc chắn muốn xóa ${itemName} này không?`;
    
    // Nếu là nhóm, cảnh báo về xóa các mục con
    if (options.isGroup) {
      title = options.title || `Xác nhận xóa ${groupItemName}`;
      message = options.message || 
        `Bạn có chắc chắn muốn xóa ${groupItemName} này không? Tất cả ${itemName} con bên trong ${groupItemName} này cũng sẽ bị xóa.`;
    }
    
    // Mở modal xác nhận
    const modalRef = this.modalService.open(DeleteConfirmationComponent, {
      backdrop: 'static',
      keyboard: false
    });
    
    modalRef.componentInstance.title = title;
    modalRef.componentInstance.message = message;
    
    // Chuyển đổi Promise thành Observable
    return from(modalRef.result).pipe(
      map(result => !!result),
      catchError(err => of(false))
    );
  }
}