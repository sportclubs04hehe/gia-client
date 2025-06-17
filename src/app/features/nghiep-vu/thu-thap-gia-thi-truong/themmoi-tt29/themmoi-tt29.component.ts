import { Component, OnInit, inject, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs';
import { trigger, state, style, transition, animate } from '@angular/animations';

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
import { HHThiTruongTreeNodeDto } from '../../../danhmuc/models/dm-hh-thitruong/HHThiTruongTreeNodeDto';

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
  styleUrls: ['./themmoi-tt29.component.css'],
  animations: [
    trigger('collapseAnimation', [
      state('expanded', style({
        height: '*',
        opacity: 1,
        visibility: 'visible'
      })),
      state('collapsed', style({
        height: '0',
        opacity: 0,
        visibility: 'hidden'
      })),
      transition('expanded => collapsed', [
        animate('250ms cubic-bezier(0.4, 0.0, 0.2, 1)')
      ]),
      transition('collapsed => expanded', [
        style({ visibility: 'visible' }),
        animate('250ms cubic-bezier(0.4, 0.0, 0.2, 1)')
      ])
    ])
  ]
})
export class ThemmoiTt29Component extends FormComponentBase implements OnInit, AfterViewInit, OnDestroy {
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
  
  // Tree data
  treeData: HHThiTruongTreeNodeDto[] = [];
  isLoadingTree = false;
  
  // Thêm khai báo này để khắc phục lỗi
  descendants: HHThiTruongTreeNodeDto[] = [];

  // Thêm thuộc tính mới để theo dõi trạng thái thu gọn
  isFormCollapsed = false;

  // Thêm biến để lưu chiều cao ban đầu
  private formOriginalHeight = 0;

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

  ngAfterViewInit(): void {
    // Lưu chiều cao ban đầu để xử lý animation tốt hơn
    const formContainer = document.querySelector('.form-container') as HTMLElement;
    if (formContainer) {
      this.formOriginalHeight = formContainer.clientHeight;
      // Set CSS variable for container height calculation
      document.documentElement.style.setProperty('--container-height', `${window.innerHeight}px`);
    }
    
    // Đăng ký sự kiện resize window để cập nhật chiều cao
    window.addEventListener('resize', this.updateContainerHeight);
  }
  
  override ngOnDestroy(): void {
    window.removeEventListener('resize', this.updateContainerHeight);
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
          
          // Load tree data for the selected item
          this.loadTreeData(result.id);
        }
      },
      () => {
        // Modal dismissed
      }
    );
  }
  
  // Load tree data for the selected product
  loadTreeData(parentId: string): void {
    this.isLoadingTree = true;
    
    this.hangHoaThiTruongService.getHierarchicalDescendants(parentId)
      .pipe(finalize(() => this.isLoadingTree = false))
      .subscribe({
        next: (response) => {
          if (response && response.data) {
            this.treeData = response.data;
            this.descendants = this.flattenTreeData(this.treeData);
          }
        },
        error: (error) => {
          console.error('Failed to load tree data:', error);
          this.toastr.error('Không thể tải cấu trúc phân cấp mặt hàng', 'Lỗi');
        }
      });
  }
  
  // Helper to flatten tree data for current UI
  flattenTreeData(nodes: HHThiTruongTreeNodeDto[], level: number = 0): HHThiTruongTreeNodeDto[] {
    let result: HHThiTruongTreeNodeDto[] = [];
    
    for (const node of nodes) {
      // Add level for indentification
      const nodeWithLevel = { ...node, level };
      result.push(nodeWithLevel);
      
      // If there are child nodes, recursively flatten them
      if (node.matHangCon && node.matHangCon.length > 0) {
        result = result.concat(this.flattenTreeData(node.matHangCon, level + 1));
      }
    }
    
    return result;
  }
  
  // Submit form
  save(): void {
    this.submitted = true;
    
    if (this.form.invalid) {
      this.markFormTouched();
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
        }
      });
  }

  // Close modal
  close(): void {
    this.activeModal.dismiss('Đóng');
  }

  // Hàm cập nhật chiều cao khi resize
  updateContainerHeight = (): void => {
    document.documentElement.style.setProperty('--container-height', `${window.innerHeight}px`);
  }
  
  // Cải thiện phương thức toggle collapse
  toggleFormCollapse(): void {
    const formContainer = document.querySelector('.form-container') as HTMLElement;
    const tableContainer = document.querySelector('.table-container') as HTMLElement;
    
    if (formContainer && !this.isFormCollapsed) {
      // Lưu chiều cao hiện tại trước khi collapse
      this.formOriginalHeight = formContainer.clientHeight;
      formContainer.style.height = `${this.formOriginalHeight}px`;
      
      // Force reflow
      formContainer.offsetHeight;
      
      // Đặt vị trí của bảng để sẵn sàng di chuyển lên
      if (tableContainer) {
        tableContainer.style.position = 'relative';
      }
    } else if (formContainer && this.isFormCollapsed) {
      // Khi mở rộng, đặt lại chiều cao
      formContainer.style.height = '0px';
      formContainer.offsetHeight; // Force reflow
      formContainer.style.height = `${this.formOriginalHeight}px`;
      
      // Đặt lại vị trí của bảng sau khi mở rộng form
      if (tableContainer) {
        setTimeout(() => {
          tableContainer.style.position = 'static';
        }, 300); // thời gian tương đương với transition
      }
    }
    
    this.isFormCollapsed = !this.isFormCollapsed;
  }

  // Thêm phương thức này trong ThemmoiTt29Component

  getIndentStyle(level: number): object {
    const indentSize = 20; // px cho mỗi cấp độ
    return {
      'padding-left': `${level * indentSize}px`
    };
  }
}
