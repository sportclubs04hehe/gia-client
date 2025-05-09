import { Component, Inject, OnInit, PLATFORM_ID, ViewChild, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { Subject, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs';
import { SharedModule } from '../../../shared/shared.module';
import { DmDonViTinhService } from '../services/dm-don-vi-tinh.service';
import { SearchBarComponent } from '../../../shared/components/search-bar/search-bar.component';
import { ActiveButtonComponent } from '../../../shared/components/active-button/active-button.component';
import { TableDataComponent } from '../../../shared/components/table-data/table-data.component';
import { TableColumn } from '../../../shared/models/table-column';
import { DonViTinhDto } from '../models/dm_donvitinh/don-ti-tinh.dto';
import { FormsModule } from '@angular/forms';
import { DeleteConfirmationComponent } from '../../../shared/components/notifications/delete-confirmation/delete-confirmation.component';
import { DonViTinhCreateDto } from '../models/dm_donvitinh/don-vi-tinh_create.dto';
import { EditDonViTinhComponent } from './edit-don-vi-tinh/edit-don-vi-tinh.component';
import { AddDonViTinhComponent } from './add-don-vi-tinh/add-don-vi-tinh.component';

@Component({
  selector: 'app-dm-don-vi-tinh',
  standalone: true,
  imports: [
    SharedModule,
    FormsModule,
    SearchBarComponent,
    ActiveButtonComponent,
    TableDataComponent,
  ],
  templateUrl: './dm-don-vi-tinh.component.html',
  styleUrl: './dm-don-vi-tinh.component.css'
})
export class DmDonViTinhComponent implements OnInit {
  @ViewChild(SearchBarComponent) searchBarComponent!: SearchBarComponent;

  private modalService = inject(NgbModal);
  private service = inject(DmDonViTinhService);
  private toastr = inject(ToastrService);
  private searchTerms = new Subject<string>();

  // Signal state
  isLoadingList = signal(false);
  isSaving = signal(false);
  selectedDonViTinh = signal<DonViTinhDto | null>(null);
  donViTinhs = signal<DonViTinhDto[]>([]);
  pageIndex = signal(1);
  readonly pageSize = 50;
  hasNextPage = signal(true);
  searchTerm = signal<string>('');

  tableColumns: TableColumn<DonViTinhDto>[] = [
    { header: 'Mã đơn vị tính', field: 'ma', width: '20%' },
    { header: 'Tên đơn vị tính', field: 'ten', width: '30%' }, {
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

  constructor(@Inject(PLATFORM_ID) private platformId: Object) { }

  ngOnInit() {
    this.setupSearchStream();
    this.loadMore();
  }

  setupSearchStream(): void {
    this.searchTerms.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      tap(term => {
        this.isLoadingList.set(true);
        this.pageIndex.set(1);
        this.donViTinhs.set([]);
        this.hasNextPage.set(true);
      }),
      switchMap(term => {
        this.searchTerm.set(term);
        const params = {
          pageIndex: 1,
          pageSize: this.pageSize,
          searchTerm: term
        };
        return term
          ? this.service.search(params)
          : this.service.getAll(params);
      })
    ).subscribe({
      next: res => {
        const items = Array.isArray(res.data) ? res.data : [];
        this.donViTinhs.set(items);
        this.hasNextPage.set(res.pagination?.hasNextPage ?? false);
        this.pageIndex.set(2);
        this.isLoadingList.set(false);

        if (this.searchBarComponent) {
          setTimeout(() => this.searchBarComponent.searchInput.nativeElement.focus(), 0);
        }
      },
      error: () => {
        this.isLoadingList.set(false);
        if (this.searchBarComponent) {
          setTimeout(() => this.searchBarComponent.searchInput.nativeElement.focus(), 0);
        }
      }
    });
  }

  onSearchChange(term: string): void {
    this.searchTerms.next(term);
  }

  clearSearch(): void {
    this.searchTerms.next('');
  }

  loadMore() {
    if (!this.hasNextPage() || this.isLoadingList()) return;

    this.isLoadingList.set(true);

    const page = this.pageIndex();
    const searchParams = {
      pageIndex: page,
      pageSize: this.pageSize,
      searchTerm: this.searchTerm()
    };

    const service = this.searchTerm()
      ? this.service.search(searchParams)
      : this.service.getAll(searchParams);

    service.subscribe({
      next: this.handlePagedResult.bind(this),
      error: () => {
        this.isLoadingList.set(false);
        this.toastr.error('Không thể tải dữ liệu', 'Lỗi');
      }
    });
  }

  private handlePagedResult(res: any): void {
    const activeElement = isPlatformBrowser(this.platformId) ? document.activeElement : null;

    const items = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);

    this.donViTinhs.update(arr => [...arr, ...items]);

    const pagination = res.pagination || {};
    this.hasNextPage.set(pagination.hasNextPage || false);
    this.pageIndex.update(i => i + 1);
    this.isLoadingList.set(false);

    if (isPlatformBrowser(this.platformId) && activeElement instanceof HTMLElement) {
      setTimeout(() => activeElement.focus(), 0);
    }
  }

  selectDonViTinh(donViTinh: DonViTinhDto): void {
    this.selectedDonViTinh.set(donViTinh);
  }

  onActionButtonClick(action: string): void {
    switch (action) {
      case 'add':
        this.openModal();
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

  openModal() {
    const modalRef = this.modalService.open(AddDonViTinhComponent, {
      size: 'xl',
      backdrop: 'static',
      keyboard: false
    });
    
    modalRef.componentInstance.title = 'Thêm đơn vị tính';

    modalRef.componentInstance.onSave = (dto: DonViTinhCreateDto): void => {
      this.isSaving.set(true);

      this.service.create(dto).subscribe({
        next: (response) => {
          this.isSaving.set(false);
          this.toastr.success('Thêm mới thành công', 'Thành công');
          this.loadFirstPage();
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
    if (!this.selectedDonViTinh()) {
      this.toastr.warning('Vui lòng chọn một đơn vị tính để sửa', 'Thông báo');
      return;
    }

    const modalRef = this.modalService.open(EditDonViTinhComponent, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
    });

    modalRef.componentInstance.title = 'Cập nhật đơn vị tính';
    modalRef.componentInstance.donViTinh = this.selectedDonViTinh();

    modalRef.result.then(
      (updated: DonViTinhDto) => {
        if (updated) {
          // Update the item in the list if it was actually updated
          this.donViTinhs.update(items => {
            return items.map(item =>
              item.id === updated.id ? updated : item
            );
          });

          // Update the selected item
          this.selectedDonViTinh.set(updated);
        }
      },
      () => { } // Dismissed case, do nothing
    );
  }

  deleteDonViTinh() {
    if (!this.selectedDonViTinh()) {
      this.toastr.warning('Vui lòng chọn một đơn vị tính để xóa', 'Thông báo');
      return;
    }

    const donViTinh = this.selectedDonViTinh();
    const modalRef = this.modalService.open(DeleteConfirmationComponent, {
      centered: true,
      backdrop: 'static',
    });

    modalRef.result.then(
      (result) => {
        if (result) {
          this.isSaving.set(true);

          this.service.delete(donViTinh!.id!).subscribe({
            next: (response) => {
              this.isSaving.set(false);
              this.selectedDonViTinh.set(null);
              this.loadFirstPage();
              this.toastr.success('Cập nhật thành công', 'Thành công');
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

  private loadFirstPage(): void {
    const activeElement = isPlatformBrowser(this.platformId) ? document.activeElement : null;

    this.pageIndex.set(1);
    this.donViTinhs.set([]);
    this.hasNextPage.set(true);
    this.loadMore();

    if (isPlatformBrowser(this.platformId) && activeElement instanceof HTMLElement) {
      setTimeout(() => activeElement.focus(), 0);
    }
  }
}
