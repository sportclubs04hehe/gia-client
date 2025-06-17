import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs';

// Services
import { ThuThapGiaThiTruongService } from '../../services/api/thu-thap-gia-thi-truong.service';
import { DmLoaiGiaService } from '../../../danhmuc/services/api/dm-loai-gia.service';
import { DmHangHoaThiTruongService } from '../../../danhmuc/services/api/dm-hang-hoa-thi-truong.service';

// Components
import { DateInputComponent } from '../../../../shared/components/forms/date-input/date-input.component';
import { FormFooterComponent } from '../../../../shared/components/forms/form-footer/form-footer.component';
import { FormComponentBase } from '../../../../shared/components/forms/forms-base/forms-base.component';
import { NhomhhModalComponent } from '../../../danhmuc/dm-hang-hoa-thi-truongs/nhomhh-modal/nhomhh-modal.component';

// Models
import { LoaiGiaDto } from '../../../danhmuc/models/dm-loai-gia/LoaiGiaDto';
import { ThuThapGiaThiTruongCreateDto } from '../../models/thu-thap-gia-thi-truong/ThuThapGiaThiTruongCreateDto';
import { stringToDateStruct } from '../../../../core/formatters/date-range-validator';
import { HHThiTruongDto } from '../../../danhmuc/models/dm-hh-thitruong/HHThiTruongDto';
import { PagedResult } from '../../../danhmuc/models/helpers/paged-result';

@Component({
  selector: 'app-themmoi-tt29',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DateInputComponent,
    FormFooterComponent,
  ],
  templateUrl: './themmoi-tt29.component.html',
  styleUrls: ['./themmoi-tt29.component.css']
})
export class ThemmoiTt29Component extends FormComponentBase implements OnInit {
  // Services
  private thuThapGiaService = inject(ThuThapGiaThiTruongService);
  private loaiGiaService = inject(DmLoaiGiaService);
  private hangHoaThiTruongService = inject(DmHangHoaThiTruongService);
  private modalService = inject(NgbModal);
  private toastr = inject(ToastrService);
  
  // Form data
  loaiGiaList: LoaiGiaDto[] = [];
  isSubmitting = false;
  submitted = false;
  
  // Selected product info
  selectedHangHoa: {id: string, ten: string, ma: string} | null = null;
  
  // Descendants list
  descendants: HHThiTruongDto[] = [];
  isLoadingDescendants = false;
  currentPage = 1;
  pageSize = 50;
  totalItems = 0;
  hasNextPage = false;

  constructor(
    protected override fb: FormBuilder,
    public activeModal: NgbActiveModal
  ) {
    super(fb);
  }

  ngOnInit(): void {
    this.buildForm();
    this.loadLoaiGias();
  }

  protected buildForm(): void {
    this.form = this.fb.group({
      id: [crypto.randomUUID()],
      hangHoaId: ['', Validators.required],
      tenHangHoa: [''],
      loaiGiaId: ['', Validators.required],
      ngayThuThap: [stringToDateStruct(new Date().toISOString().split('T')[0]), Validators.required]
    });
  }

  // Getter for easy access to form fields
  get f() {
    return this.form.controls;
  }

  // Load loại giá options
  loadLoaiGias(): void {
    this.loaiGiaService.getAll({pageIndex: 1, pageSize: 100})
      .subscribe({
        next: (result) => {
          this.loaiGiaList = result.data;
        },
        error: (error) => {
          console.error('Failed to load loại giá options:', error);
        }
      });
  }

  // Open product selection modal
  openProductModal(): void {
    const modalRef = this.modalService.open(NhomhhModalComponent, {
      size: 'lg',
      backdrop: 'static',
      keyboard: false
    });
    
    // Pass currently selected product if any
    if (this.selectedHangHoa) {
      modalRef.componentInstance.preSelectedId = this.selectedHangHoa.id;
    }
    
    // Handle modal close result
    modalRef.result.then(
      (result) => {
        if (result && result.id) {
          this.selectedHangHoa = {
            id: result.id,
            ten: result.ten,
            ma: result.ma || ''
          };
          
          // Update form values
          this.form.patchValue({ hangHoaId: result.id });
          
          // Load descendants for the selected item
          this.loadDescendants(result.id);
        }
      },
      () => {
        // Modal dismissed
      }
    );
  }
  
  // Load descendants for the selected product
  loadDescendants(parentId: string, pageIndex: number = 1): void {
    this.isLoadingDescendants = true;
    
    this.hangHoaThiTruongService.getAllDescendantsByParentId(parentId, pageIndex, this.pageSize)
      .pipe(finalize(() => this.isLoadingDescendants = false))
      .subscribe({
        next: (result: any) => {
          // Trích xuất mảng dữ liệu
          let itemsArray = [];
          
          if (result && result.data && Array.isArray(result.data.data)) {
            itemsArray = result.data.data;
          } else if (result && Array.isArray(result.data)) {
            itemsArray = result.data;
          }
          
          // Xử lý phân cấp và sắp xếp (nếu cần)
          let processedItems = this.processItemsForDisplay(itemsArray);
          
          if (pageIndex === 1) {
            this.descendants = processedItems;
          } else {
            this.descendants = [...this.descendants, ...processedItems];
          }
          
          // Cập nhật phân trang
          const pagination = result.pagination || (result.data && result.data.pagination) || {};
          
          this.currentPage = pagination.currentPage || pageIndex;
          this.totalItems = pagination.totalItems || 0;
          this.hasNextPage = pagination.hasNextPage || false;
        },
        error: (error) => {
          console.error('Failed to load descendants:', error);
          this.toastr.error('Không thể tải danh sách mặt hàng con', 'Lỗi');
        }
      });
  }

  // Phương thức hỗ trợ xử lý dữ liệu hiển thị phân cấp
  processItemsForDisplay(items: any[]): any[] {
    if (!items || !items.length) return [];
    
    // Phân loại các mặt hàng cha/con
    const parents = items.filter(item => item.loaiMatHang === 0);
    const children = items.filter(item => item.loaiMatHang === 1);
    
    // Sắp xếp theo mã (nếu backend chưa sắp xếp)
    const sortedItems = [...items].sort((a, b) => {
      // Sắp xếp theo cấp độ trước
      if (a.loaiMatHang !== b.loaiMatHang) {
        return a.loaiMatHang - b.loaiMatHang; // Cha (0) trước Con (1)
      }
      
      // Sau đó sắp xếp theo mã
      return a.ma.localeCompare(b.ma, undefined, { numeric: true, sensitivity: 'base' });
    });
    
    return sortedItems;
  }
  
  // Load more descendants (pagination)
  loadMoreDescendants(): void {
    if (this.hasNextPage && this.selectedHangHoa) {
      this.loadDescendants(this.selectedHangHoa.id, this.currentPage + 1);
    }
  }

  // Submit form
  save(): void {
    this.submitted = true;
    
    if (this.form.invalid) {
      this.markFormTouched();
      this.toastr.error('Vui lòng kiểm tra lại thông tin', 'Lỗi');
      return;
    }
    
    this.isSubmitting = true;
    
    // Prepare data for submission
    const createDto: ThuThapGiaThiTruongCreateDto = this.prepareFormData(['ngayThuThap']);
    
    // Call API to create new record
    this.thuThapGiaService.create(createDto)
      .pipe(finalize(() => this.isSubmitting = false))
      .subscribe({
        next: (response) => {
          this.toastr.success('Thêm mới thành công', 'Thông báo');
          this.activeModal.close('Đã lưu');
        },
        error: (error) => {
          console.error('Error creating record:', error);
          this.toastr.error(error.error?.message || 'Không thể thêm mới. Vui lòng thử lại sau', 'Lỗi');
        }
      });
  }

  // Close modal
  close(): void {
    this.activeModal.dismiss('Đóng');
  }
}
