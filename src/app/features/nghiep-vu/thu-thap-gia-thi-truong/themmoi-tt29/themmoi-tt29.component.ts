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
import { HangHoaGiaThiTruongDto } from '../../models/thu-thap-gia-thi-truong/HangHoaGiaThiTruongDto';

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
  private thuThapGiaService = inject(ThuThapGiaThiTruongService);
  private loaiGiaService = inject(DmLoaiGiaService);
  private modalService = inject(NgbModal);
  private toastr = inject(ToastrService);
  
  loaiGiaList: LoaiGiaDto[] = [];
  isSubmitting = false;
  submitted = false;
  
  selectedHangHoa: {id: string, ten: string, ma: string} | null = null;
  
  treeData: HHThiTruongTreeNodeDto[] = [];
  isLoadingTree = false;
  
  // Thay đổi kiểu dữ liệu từ HHThiTruongTreeNodeDto sang HangHoaGiaThiTruongDto
  descendants: HangHoaGiaThiTruongDto[] = [];

  isFormCollapsed = false;

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
    const formContainer = document.querySelector('.form-container') as HTMLElement;
    if (formContainer) {
      this.formOriginalHeight = formContainer.clientHeight;
      document.documentElement.style.setProperty('--container-height', `${window.innerHeight}px`);
    }
    
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

  get f() {
    return this.form.controls;
  }

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

  openProductModal(): void {
    const modalRef = this.modalService.open(NhomhhModalComponent, {
      size: 'lg',
      backdrop: 'static',
      keyboard: false
    });
    
    if (this.selectedHangHoa) {
      modalRef.componentInstance.selectedData = this.selectedHangHoa;
    }
    
    modalRef.result.then(
      (result) => {
        if (result) {
          this.selectedHangHoa = result;
          this.form.patchValue({
            hangHoaId: result.id,
            tenHangHoa: result.ten
          });
          
          // Tải dữ liệu cây khi đã chọn hàng hóa
          this.loadTreeData(result.id);
        }
      },
      () => {
        // Modal dismissed
      }
    );
  }
  
  // Cập nhật phương thức loadTreeData
  loadTreeData(parentId: string): void {
    this.isLoadingTree = true;
    
    // Lấy ngày thu thập và loại giá từ form
    const ngayThuThap = this.form.get('ngayThuThap')?.value;
    const loaiGiaId = this.form.get('loaiGiaId')?.value;
    
    // Chuyển đổi ngày từ NgBootstrap DateStruct sang Date
    const ngayThuThapDate = ngayThuThap ? 
      new Date(ngayThuThap.year, ngayThuThap.month - 1, ngayThuThap.day) : 
      new Date();
    
    this.thuThapGiaService.getHierarchicalDataWithPreviousPrices(
      parentId, 
      ngayThuThapDate, 
      loaiGiaId
    )
    .pipe(finalize(() => this.isLoadingTree = false))
    .subscribe({
      next: (response) => {
        if (response.data) {
          this.descendants = this.flattenTreeData(response.data);
        } else {
          this.descendants = [];
        }
      },
      error: (error) => {
        console.error('Lỗi khi tải dữ liệu cây hàng hóa:', error);
        this.toastr.error('Có lỗi xảy ra khi tải dữ liệu hàng hóa');
        this.descendants = [];
      }
    });
  }
  
  // Cập nhật phương thức flattenTreeData để làm việc với HangHoaGiaThiTruongDto
  flattenTreeData(nodes: HangHoaGiaThiTruongDto[], level: number = 0): HangHoaGiaThiTruongDto[] {
    let result: HangHoaGiaThiTruongDto[] = [];
    
    for (const node of nodes) {
      // Gán level cho node
      const nodeWithLevel = { ...node, level };
      result.push(nodeWithLevel);
      
      // Đệ quy cho các con
      if (node.matHangCon && node.matHangCon.length > 0) {
        result = result.concat(this.flattenTreeData(node.matHangCon, level + 1));
      }
    }
    
    return result;
  }
  
  save(): void {
    this.submitted = true;
    
    if (this.form.invalid) {
      this.markFormTouched();
      return;
    }
    
    this.isSubmitting = true;
    
    const createDto: ThuThapGiaThiTruongCreateDto = this.prepareFormData(['ngayThuThap']);
    
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

  close(): void {
    this.activeModal.dismiss('Đóng');
  }

  updateContainerHeight = (): void => {
    document.documentElement.style.setProperty('--container-height', `${window.innerHeight}px`);
  }
  
  toggleFormCollapse(): void {
    const formContainer = document.querySelector('.form-container') as HTMLElement;
    const tableContainer = document.querySelector('.table-container') as HTMLElement;
    
    if (formContainer && !this.isFormCollapsed) {
      this.formOriginalHeight = formContainer.clientHeight;
      formContainer.style.height = `${this.formOriginalHeight}px`;
      
      formContainer.offsetHeight;
      
      if (tableContainer) {
        tableContainer.style.position = 'relative';
      }
    } else if (formContainer && this.isFormCollapsed) {
      formContainer.style.height = '0px';
      formContainer.offsetHeight; 
      formContainer.style.height = `${this.formOriginalHeight}px`;
      if (tableContainer) {
        setTimeout(() => {
          tableContainer.style.position = 'static';
        }, 300); 
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
