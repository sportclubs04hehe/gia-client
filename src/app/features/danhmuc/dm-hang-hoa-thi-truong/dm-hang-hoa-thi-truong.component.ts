import { Component, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ThemMoiComponent } from './them-moi/them-moi.component';
import { DmThitruongService } from '../services/dm-thitruong.service';
import { HangHoa } from '../models/hanghoathitruong/dm-thitruong';
import { PagedResult } from '../models/paged-result';
import { HangHoaCreateDto } from '../models/hanghoathitruong/hh-thitruong-create';
import { EditComponent } from './edit/edit.component';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../shared/shared.module';
@Component({
  selector: 'app-dm-hang-hoa-thi-truong',
  standalone: true,
  imports: [
    SharedModule,
  ],
  templateUrl: './dm-hang-hoa-thi-truong.component.html',
  styleUrl: './dm-hang-hoa-thi-truong.component.css'
})
export class DmHangHoaThiTruongComponent implements OnInit {
  private modalService = inject(NgbModal);
  private svc = inject(DmThitruongService);
  private toastr = inject(ToastrService);

  isLoadingList = signal(false);

  isSaving = signal(false);

  selectedHangHoa = signal<HangHoa | null>(null);

  hangHoas: WritableSignal<HangHoa[]> = signal([]);
  pageIndex = signal(1);
  readonly pageSize = 8;
  hasNextPage = signal(true);

  ngOnInit() {
    this.loadMore();
  }

  loadMore() {
    if (!this.hasNextPage() || this.isLoadingList()) return;
    this.isLoadingList.set(true);

    const page = this.pageIndex();
    this.svc.getAll({ pageIndex: page, pageSize: this.pageSize }).subscribe({
      next: (res: PagedResult<HangHoa>) => {
        // Check if res has the expected structure
        const items = Array.isArray(res.data) ? res.data :
          (Array.isArray(res) ? res : []);

        this.hangHoas.update(arr => [...arr, ...items]);

        // Access pagination data safely
        const pagination = res.pagination || {};
        this.hasNextPage.set(pagination.hasNextPage || false);
        this.pageIndex.update(i => i + 1);
        this.isLoadingList.set(false);
      },
      error: () => this.isLoadingList.set(false)
    });
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

  selectHangHoa(hangHoa: HangHoa): void {
    this.selectedHangHoa.set(hangHoa);
  }

  openModalEdit(): void {
    if (!this.selectedHangHoa()) {
      this.toastr.warning('Vui lòng chọn một mặt hàng để sửa', 'Chưa chọn mặt hàng');
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
      result => {
        if (result === true) { // Only reload if actual changes were made
          this.loadFirstPage();
          this.selectedHangHoa.set(null); // Clear selection after edit
          this.toastr.success('Cập nhật mặt hàng thành công', 'Thành công');
        }
      },
      reason => console.log('Modal dismissed with:', reason)
    );
  }

  deleteHangHoa(): void {
    if (!this.selectedHangHoa()) {
      this.toastr.warning('Vui lòng chọn một mặt hàng để xóa', 'Chưa chọn mặt hàng');
      return;
    }

    const hangHoa = this.selectedHangHoa();

    // Use toastr.confirm if available, otherwise keep the native confirm for now
    if (!confirm(`Bạn có chắc chắn muốn xóa mặt hàng "${hangHoa?.tenMatHang}" không?`)) {
      return;
    }

    this.isSaving.set(true);

    this.svc.delete(hangHoa!.id!).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.selectedHangHoa.set(null);
        this.loadFirstPage();
        this.toastr.success(`Đã xóa mặt hàng "${hangHoa?.tenMatHang}"`, 'Thành công');
      },
      error: (err) => {
        this.isSaving.set(false);
        console.error('Error deleting item:', err);
        this.toastr.error('Có lỗi xảy ra khi xóa mặt hàng. Vui lòng thử lại sau.', 'Lỗi');
      }
    });
  }

  private loadFirstPage(): void {
    this.pageIndex.set(1);
    this.hangHoas.set([]);
    this.hasNextPage.set(true);
    this.loadMore();
  }

  onScroll() {
    this.loadMore();
  }

}
