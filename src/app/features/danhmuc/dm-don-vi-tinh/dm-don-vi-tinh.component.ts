import { Component, Inject, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../shared/shared.module';
import { ActiveButtonComponent } from '../../../shared/components/active-button/active-button.component';
import { TableDataComponent } from '../../../shared/components/table/table-data/table-data.component';
import { DonViTinhDto } from '../models/dm_donvitinh/don-ti-tinh.dto';
import { FormsModule } from '@angular/forms';
import { DeleteConfirmationComponent } from '../../../shared/components/notifications/delete-confirmation/delete-confirmation.component';
import { DonViTinhCreateDto } from '../models/dm_donvitinh/don-vi-tinh_create.dto';
import { EditDonViTinhComponent } from './edit-don-vi-tinh/edit-don-vi-tinh.component';
import { AddDonViTinhComponent } from './add-don-vi-tinh/add-don-vi-tinh.component';
import { DmDonViTinhService } from '../services/api/dm-don-vi-tinh.service';
import { GetAndSearchBaseComponent } from '../../../shared/components/bases/get-search.base';
import { PaginationParams } from '../models/helpers/pagination-params';
import { Observable } from 'rxjs';
import { PagedResult } from '../models/helpers/paged-result';
import { SearchParams } from '../models/helpers/search-params';
import { SearchInputComponent } from '../../../shared/components/search/search-input/search-input.component';

@Component({
  selector: 'app-dm-don-vi-tinh',
  standalone: true,
  imports: [
    SharedModule,
    FormsModule,
    ActiveButtonComponent,
    TableDataComponent,
    SearchInputComponent,
  ],
  templateUrl: './dm-don-vi-tinh.component.html',
  styleUrl: './dm-don-vi-tinh.component.css'
})
export class DmDonViTinhComponent extends GetAndSearchBaseComponent<DonViTinhDto, DmDonViTinhService> {
  private modalService = inject(NgbModal);
  private donViTinhService = inject(DmDonViTinhService);
  private toastr = inject(ToastrService);
  
  // Trạng thái riêng cho component
  isSaving = signal(false);
  
  get service(): DmDonViTinhService {
    return this.donViTinhService;
  }

  constructor(@Inject(PLATFORM_ID) private platformId: Object) { 
    super();
  }

  protected getAllFromService(params: PaginationParams): Observable<PagedResult<DonViTinhDto>> {
    return this.donViTinhService.getAll(params);
  }
  
  protected searchFromService(params: SearchParams): Observable<PagedResult<DonViTinhDto>> {
    return this.donViTinhService.search(params);
  }

  getIdField(): string {
    return 'id';
  }

  initColumns(): void {
    this.columns = [
      { header: 'Mã đơn vị tính', field: 'ma', width: '20%' },
      { header: 'Tên đơn vị tính', field: 'ten', width: '30%' }, 
      {
        header: 'Ngày hiệu lực',
        field: 'ngayHieuLuc',
        width: '15%',
        formatter: (item: DonViTinhDto) => {
          return new Date(item.ngayHieuLuc).toLocaleDateString('vi-VN');
        }
      },
      {
        header: 'Ngày hết hiệu lực',
        field: 'ngayHetHieuLuc',
        width: '15%',
        formatter: (item: DonViTinhDto) => {
          return new Date(item.ngayHetHieuLuc).toLocaleDateString('vi-VN');
        }
      }
    ];
  }

  onActionButtonClick(action: string): void {
    switch (action) {
      case 'add':
        this.openAddModal();
        break;
      case 'edit':
        this.openModalEdit();
        break;
      case 'delete':
        this.deleteDonViTinh();
        break;
      case 'import':
        this.openImportModal();
        break;
    }
  }

  openAddModal() {
    const modalRef = this.modalService.open(AddDonViTinhComponent, {
      size: 'xl',
      backdrop: 'static',
      keyboard: false
    });
    
    modalRef.componentInstance.title = 'Thêm đơn vị tính';

    modalRef.componentInstance.onSave = (dto: DonViTinhCreateDto): void => {
      this.isSaving.set(true);

      this.donViTinhService.create(dto).subscribe({
        next: (response) => {
          this.isSaving.set(false);
          this.toastr.success('Thêm mới thành công', 'Thành công');
          this.reloadData();
        },
        error: (err) => {
          this.isSaving.set(false);
          console.error('Error creating item:', err);
          this.toastr.error(err.error?.message || 'Có lỗi xảy ra khi thêm đơn vị tính', 'Lỗi');
        }
      });
    };
  }

  openModalEdit(): void {
    if (!this.selectedItem()) {
      this.toastr.warning('Vui lòng chọn một đơn vị tính để sửa', 'Thông báo');
      return;
    }

    const modalRef = this.modalService.open(EditDonViTinhComponent, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
    });

    modalRef.componentInstance.title = 'Cập nhật đơn vị tính';
    modalRef.componentInstance.donViTinh = this.selectedItem();

    modalRef.result.then(
      (updated: DonViTinhDto) => {
        if (updated) {
          // Update the item in the list if it was actually updated
          this.items.update(items => {
            return items.map(item =>
              item.id === updated.id ? updated : item
            );
          });

          // Update the selected item
          this.selectedItem.set(updated);
        }
      },
      () => { } // Dismissed case, do nothing
    );
  }

  deleteDonViTinh() {
    if (!this.selectedItem()) {
      this.toastr.warning('Vui lòng chọn một đơn vị tính để xóa', 'Thông báo');
      return;
    }

    const donViTinh = this.selectedItem();
    const modalRef = this.modalService.open(DeleteConfirmationComponent, {
      centered: true,
      backdrop: 'static',
    });

    modalRef.result.then(
      (result) => {
        if (result) {
          this.isSaving.set(true);

          this.donViTinhService.delete(donViTinh!.id!).subscribe({
            next: (response) => {
              this.isSaving.set(false);
              this.selectedItem.set(null);
              this.reloadData();
              this.toastr.success('Xóa thành công', 'Thành công');
            },
            error: (err) => {
              this.isSaving.set(false);
              console.error('Error deleting item:', err);
              this.toastr.error(err.error?.message || 'Có lỗi xảy ra khi xóa đơn vị tính. Vui lòng thử lại sau.', 'Lỗi');
            }
          });
        }
      }
    );
  }

  openImportModal() {
    this.toastr.info('Chức năng nhập Excel đang được phát triển', 'Thông báo');
  }

  private reloadData(): void {
    const activeElement = isPlatformBrowser(this.platformId) ? document.activeElement : null;

    this.currentPage.set(1);
    this.items.set([]);
    this.loadData();

    if (isPlatformBrowser(this.platformId) && activeElement instanceof HTMLElement) {
      setTimeout(() => activeElement.focus(), 0);
    }
  }
}
