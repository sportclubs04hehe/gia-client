import { Component, ElementRef, inject, OnInit, signal, ViewChild, WritableSignal, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ThemMoiComponent } from './them-moi/them-moi.component';
import { DmThitruongService } from '../services/dm-thitruong.service';
import { HangHoa } from '../models/hanghoathitruong/dm-thitruong';
import { PagedResult } from '../models/paged-result';
import { HangHoaCreateDto } from '../models/hanghoathitruong/hh-thitruong-create';
import { EditComponent } from './edit/edit.component';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../shared/shared.module';
import { debounceTime, distinctUntilChanged, Subject, switchMap, tap } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ImportExcelComponent } from '../import-excel/import-excel.component';
import { SearchBarComponent } from './search-bar/search-bar.component';
import { HangHoaTableComponent } from './hang-hoa-table/hang-hoa-table.component';
import { ActiveButtonComponent } from './active-button/active-button.component';
import { DeleteConfirmationComponent } from '../../../shared/components/delete-confirmation/delete-confirmation.component';

@Component({
  selector: 'app-dm-hang-hoa-thi-truong',
  standalone: true,
  imports: [
    SharedModule,
    FormsModule,
    SearchBarComponent,
    ActiveButtonComponent,
    HangHoaTableComponent
  ],
  templateUrl: './dm-hang-hoa-thi-truong.component.html',
  styleUrl: './dm-hang-hoa-thi-truong.component.css'
})
export class DmHangHoaThiTruongComponent implements OnInit {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  private modalService = inject(NgbModal);
  private svc = inject(DmThitruongService);
  private toastr = inject(ToastrService);
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

  constructor(@Inject(PLATFORM_ID) private platformId: Object) { }

  ngOnInit() {
    this.setupSearchStream();
    this.loadMore();
  }

  openModal() {
    const modalRef = this.modalService.open(ThemMoiComponent, { size: 'xl' });
    modalRef.componentInstance.title = 'Thêm mặt hàng';

    modalRef.componentInstance.onSave = (dto: HangHoaCreateDto): void => {
      this.isSaving.set(true);

      this.svc.add(dto).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.toastr.success('Thêm mặt hàng thành công', 'Thành công');
          this.loadFirstPage();
        },
        error: (error) => {
          this.isSaving.set(false);
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

        this.toastr.success('Cập nhật mặt hàng thành công', 'Thành công');
      }
    );
  }

  setupSearchStream(): void {
    this.searchTerms.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      tap(term => {
        // trước mỗi request, reset pagination + loading
        this.isLoadingList.set(true);
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
        // handle kết quả trang đầu
        const items = Array.isArray(res.data) ? res.data : [];
        this.hangHoas.set(items);
        this.hasNextPage.set(res.pagination?.hasNextPage ?? false);
        this.pageIndex.set(2);
        this.isLoadingList.set(false);
        // restore focus ngay sau khi loading xong
        setTimeout(() => this.searchInput.nativeElement.focus(), 0);
      },
      error: () => {
        this.isLoadingList.set(false);
        setTimeout(() => this.searchInput.nativeElement.focus(), 0);
      }
    });
  }

  onSearchChange(term: string): void {
    this.searchTerms.next(term);
  }

  clearSearch(): void {
    this.searchTermModel = '';
    this.searchTerms.next('');
    // No need to access searchInput directly anymore
  }

  loadMore() {
    // Guard clause to prevent loading if we're already loading or there's no more data
    if (!this.hasNextPage() || this.isLoadingList()) return;
    
    this.isLoadingList.set(true);
  
    const page = this.pageIndex();
    const searchParams = {
      pageIndex: page,
      pageSize: this.pageSize,
      searchTerm: this.searchTerm()
    };
  
    // Use a single service call with conditional service selection
    const service = this.searchTerm() 
      ? this.svc.search(searchParams) 
      : this.svc.getAll(searchParams);
      
    service.subscribe({
      next: this.handlePagedResult.bind(this),
      error: () => this.isLoadingList.set(false)
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
    
    // Open delete confirmation modal instead of using confirm()
    const modalRef = this.modalService.open(DeleteConfirmationComponent, {
      centered: false,
      backdrop: 'static',
    });
    
    // Handle the confirmation result
    modalRef.result.then(
      (result) => {
        if (result) {
          this.isSaving.set(true);
          
          this.svc.delete(hangHoa!.id!).subscribe({
            next: () => {
              this.isSaving.set(false);
              this.selectedHangHoa.set(null);
              this.loadFirstPage();
              this.toastr.success(`Đã xóa mặt hàng thành công`, 'Thành công');
            },
            error: (err) => {
              this.isSaving.set(false);
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
}
