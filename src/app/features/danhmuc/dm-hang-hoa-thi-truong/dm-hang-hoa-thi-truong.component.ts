import { Component, ElementRef, inject, OnInit, signal, ViewChild, WritableSignal, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ThemMoiComponent } from './them-moi/them-moi.component';
import { DmThitruongService } from '../services/dm-thitruong.service';
import { HangHoa } from '../models/dm_hanghoathitruong/dm-thitruong';
import { PagedResult } from '../models/paged-result';
import { HangHoaCreateDto } from '../models/dm_hanghoathitruong/hh-thitruong-create';
import { EditComponent } from './edit/edit.component';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../shared/shared.module';
import { debounceTime, distinctUntilChanged, Subject, switchMap, tap } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { SearchBarComponent } from '../../../shared/components/search-bar/search-bar.component';
import { DeleteConfirmationComponent } from '../../../shared/components/notifications/delete-confirmation/delete-confirmation.component';
import { ActiveButtonComponent } from '../../../shared/components/active-button/active-button.component';
import { TableColumn } from '../../../shared/models/table-column';
import { TableDataComponent } from '../../../shared/components/table-data/table-data.component';
import { ImportExcelComponent } from './import-excel/import-excel.component';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-dm-hang-hoa-thi-truong',
  standalone: true,
  imports: [
    SharedModule,
    FormsModule,
    SearchBarComponent,
    ActiveButtonComponent,
    TableDataComponent,
    NgxSpinnerModule, 
  ],
  templateUrl: './dm-hang-hoa-thi-truong.component.html',
  styleUrl: './dm-hang-hoa-thi-truong.component.css'
})
export class DmHangHoaThiTruongComponent implements OnInit {
  @ViewChild(SearchBarComponent) searchBarComponent!: SearchBarComponent;

  private modalService = inject(NgbModal);
  private svc = inject(DmThitruongService);
  private toastr = inject(ToastrService);
  private spinner = inject(NgxSpinnerService);
  private searchTerms = new Subject<string>();

  isLoadingList = signal(false);

  isSaving = signal(false);

  selectedHangHoa = signal<HangHoa | null>(null);

  hangHoas: WritableSignal<HangHoa[]> = signal([]);
  pageIndex = signal(1);
  readonly pageSize = 50;
  hasNextPage = signal(true);

  searchTerm = signal<string>('');
  searchTermModel: string = '';

  tableColumns: TableColumn<HangHoa>[] = [
    { header: 'Mã mặt hàng', field: 'maMatHang', width: '15%' },
    { header: 'Tên mặt hàng', field: 'tenMatHang', width: '30%' },
    { header: 'Ghi chú', field: 'ghiChu', width: '20%' },
    {
      header: 'Ngày hiệu lực',
      field: 'ngayHieuLuc',
      width: '15%',
      formatter: (item: HangHoa) => {
        return new Date(item.ngayHieuLuc).toLocaleDateString('vi-VN');
      }
    },
    {
      header: 'Ngày hết hiệu lực',
      field: 'ngayHetHieuLuc',
      width: '15%',
      formatter: (item: HangHoa) => {
        return new Date(item.ngayHetHieuLuc).toLocaleDateString('vi-VN');
      }
    }
  ];

  constructor(@Inject(PLATFORM_ID) private platformId: Object) { }

  ngOnInit() {
    this.setupSearchStream();
    this.loadMore();
  }

  openModal() {
    const modalRef = this.modalService.open(ThemMoiComponent, { 
      size: 'xl',
      backdrop: 'static', 
      keyboard: false    
    });
    
    modalRef.componentInstance.title = 'Thêm mặt hàng';
  
    modalRef.componentInstance.onSave = (dto: HangHoaCreateDto): void => {
      this.isSaving.set(true);
      this.spinner.show('savingSpinner');
  
      this.svc.add(dto).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.spinner.hide('savingSpinner');
          this.toastr.success('Thêm mặt hàng thành công', 'Thành công');
          this.loadFirstPage();
        },
        error: (error) => {
          this.isSaving.set(false);
          this.spinner.hide('savingSpinner');
          this.toastr.error('Không thể thêm mặt hàng', 'Lỗi');
        }
      });
    };
  }

  openImportModal() {
    const modalRef = this.modalService.open(ImportExcelComponent, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
    });

    modalRef.result.then(
      (refreshList: boolean) => {
        if (refreshList) {
          this.loadFirstPage();
        }
      }
    );
  }

  openModalEdit(): void {
    if (!this.selectedHangHoa()) {
      this.toastr.warning('Vui lòng chọn một mặt hàng để sửa', 'Thông báo');
      return;
    }

    const modalRef = this.modalService.open(EditComponent, {
      size: 'xl',
      centered: true,
      backdrop: 'static',
    });

    modalRef.componentInstance.title = 'Cập nhật mặt hàng';
    modalRef.componentInstance.hangHoa = this.selectedHangHoa();

    modalRef.result.then(
      (updated: HangHoa) => {
        this.hangHoas.update(list =>
          list.map(h => h.id === updated.id ? updated : h)
        );
        this.selectedHangHoa.set(updated);
        setTimeout(() => {
          const el = document.getElementById(`item-${updated.id}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });

        this.toastr.success('Cập nhật thành công', 'Thành công');
      }
    );
  }

  setupSearchStream(): void {
    this.searchTerms.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      tap(term => {
        this.isLoadingList.set(true);
        this.spinner.show('tableSpinner');
        this.pageIndex.set(1);
        this.hangHoas.set([]);
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
          ? this.svc.search(params)
          : this.svc.getAll(params);
      })
    ).subscribe({
      next: res => {
        const items = Array.isArray(res.data) ? res.data : [];
        this.hangHoas.set(items);
        this.hasNextPage.set(res.pagination?.hasNextPage ?? false);
        this.pageIndex.set(2);
        this.isLoadingList.set(false);
        this.spinner.hide('tableSpinner');
        
        if (this.searchBarComponent) {
          setTimeout(() => this.searchBarComponent.searchInput.nativeElement.focus(), 0);
        }
      },
      error: () => {
        this.isLoadingList.set(false);
        this.spinner.hide('tableSpinner');
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
    this.searchTermModel = '';
    this.searchTerms.next('');
  }

  loadMore() {
    if (!this.hasNextPage() || this.isLoadingList()) return;

    this.isLoadingList.set(true);
    this.spinner.show('tableSpinner');

    const page = this.pageIndex();
    const searchParams = {
      pageIndex: page,
      pageSize: this.pageSize,
      searchTerm: this.searchTerm()
    };

    const service = this.searchTerm()
      ? this.svc.search(searchParams)
      : this.svc.getAll(searchParams);

    service.subscribe({
      next: this.handlePagedResult.bind(this),
      error: () => {
        this.isLoadingList.set(false);
        this.spinner.hide('tableSpinner');
      }
    });
  }

  private handlePagedResult(res: PagedResult<HangHoa>): void {
    const activeElement = isPlatformBrowser(this.platformId) ? document.activeElement : null;

    const items = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);

    this.hangHoas.update(arr => [...arr, ...items]);

    const pagination = res.pagination || {};
    this.hasNextPage.set(pagination.hasNextPage || false);
    this.pageIndex.update(i => i + 1);
    this.isLoadingList.set(false);
    this.spinner.hide('tableSpinner');

    if (isPlatformBrowser(this.platformId) && activeElement instanceof HTMLElement) {
      setTimeout(() => activeElement.focus(), 0);
    }
  }

  private loadFirstPage(): void {
    const activeElement = isPlatformBrowser(this.platformId) ? document.activeElement : null;

    this.pageIndex.set(1);
    this.hangHoas.set([]);
    this.hasNextPage.set(true);
    this.loadMore();

    if (isPlatformBrowser(this.platformId) && activeElement instanceof HTMLElement) {
      setTimeout(() => activeElement.focus(), 0);
    }
  }

  onScroll() {
    this.loadMore();
  }
  selectHangHoa(hangHoa: HangHoa): void {
    this.selectedHangHoa.set(hangHoa);
  }

  deleteHangHoa(): void {
    if (!this.selectedHangHoa()) {
      this.toastr.warning('Vui lòng chọn một mặt hàng để xóa', 'Thông báo');
      return;
    }

    const hangHoa = this.selectedHangHoa();

    const modalRef = this.modalService.open(DeleteConfirmationComponent, {
      centered: false,
      backdrop: 'static',
    });

    modalRef.result.then(
      (result) => {
        if (result) {
          this.isSaving.set(true);
          this.spinner.show('savingSpinner');

          this.svc.delete(hangHoa!.id!).subscribe({
            next: () => {
              this.isSaving.set(false);
              this.spinner.hide('savingSpinner');
              this.selectedHangHoa.set(null);
              this.loadFirstPage();
              this.toastr.success(`Đã xóa mặt hàng thành công`, 'Thành công');
            },
            error: (err) => {
              this.isSaving.set(false);
              this.spinner.hide('savingSpinner');
              console.error('Error deleting item:', err);
              this.toastr.error('Có lỗi xảy ra khi xóa mặt hàng. Vui lòng thử lại sau.', 'Lỗi');
            }
          });
        }
      },
      () => {
        // Modal dismissed, do nothing
      }
    );
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
        this.deleteHangHoa();
        break;
      case 'import':
        this.openImportModal();
        break;
    }
  }
}
