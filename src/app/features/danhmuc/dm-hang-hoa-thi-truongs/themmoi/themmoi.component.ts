import { Component, OnInit, inject, ViewChild, ElementRef, Input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TextInputComponent } from '../../../../shared/components/forms/text-input/text-input.component';
import { DateInputComponent } from '../../../../shared/components/forms/date-input/date-input.component';
import { DmHangHoaThiTruongService } from '../../services/api/dm-hang-hoa-thi-truong.service';
import { dateRangeValidator, dateStructToString, generateDefaultDateRange } from '../../../../core/formatters/date-range-validator';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { FormComponentBase } from '../../../../shared/components/forms/forms-base/forms-base.component';
import { DonViTinhSelectionService } from '../../services/utils/don-vi-tinh-selection.service';
import { DonViTinhSelectDto } from '../../models/dm_donvitinh/don-vi-tinh-select.dto';
import { NhomhhModalComponent } from '../nhomhh-modal/nhomhh-modal.component'; // Import component modal
import { ModalNotificationService } from '../../../../shared/components/notifications/modal-notification/modal-notification.service';
import { FormFooterComponent } from '../../../../shared/components/forms/form-footer/form-footer.component';
import { CodeInputDirective } from '../../helpers/code-input.directive';
import { codeValidator } from '../../helpers/code-validator';
import { uniqueHHThiTruongCodeValidator } from '../../helpers/uniqueHHThiTruongCodeValidator';
import { Loai } from '../../models/enum/loai';
@Component({
  selector: 'app-themmoi',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TextInputComponent,
    DateInputComponent,
    FormFooterComponent,
    CodeInputDirective 
  ],
  templateUrl: './themmoi.component.html',
  styleUrl: './themmoi.component.css'
})
export class ThemmoiComponent extends FormComponentBase implements OnInit {
  // Thêm reference đến modal-body để điều khiển scroll
  @ViewChild('modalBody', { static: false }) modalBody?: ElementRef;

  activeModal = inject(NgbActiveModal);
  hangHoaService = inject(DmHangHoaThiTruongService);
  donViTinhSelectionService = inject(DonViTinhSelectionService);
  modalNotificationService = inject(ModalNotificationService);
  // Inject NgbModal service
  private modalService = inject(NgbModal);

  title = 'Thêm mới hàng hóa thị trường';
  submitting = false;
  loai = Loai;
  formModified = false;
  
  // Biến theo dõi trạng thái switch "Là hàng hóa / tài sản"
  isHangHoa = false;
  
  // Thông tin đơn vị tính được chọn
  selectedDonViTinh: DonViTinhSelectDto | null = null;
  // Thông tin nhóm hàng hóa được chọn
  selectedNhomHangHoa: { id: string, ten: string } | null = null;
  
  // Trạng thái icon khi focus vào ô chọn đơn vị tính
  iconFill = false;
  // Trạng thái icon khi focus vào ô chọn nhóm hàng hóa
  nhomHangHoaIconFill = false;
  
  // Danh sách nhóm mặt hàng để hiển thị dropdown
  nhomMatHangList: { id: string, ten: string }[] = [];

  @Input() nhomHangHoaList: { id: string, ten: string }[] = [];

  constructor(protected override fb: FormBuilder) {
    super(fb);
  }

  ngOnInit(): void {
    this.buildForm();
    this.loadDanhMucLienQuan();
    
    // Listen for form changes
    this.form.valueChanges.subscribe(() => {
      this.formModified = true;
    });
  }

  // Triển khai phương thức buildForm từ lớp cơ sở
  protected buildForm(): void {
    // Tạo giá trị mặc định cho ngày hiệu lực và ngày hết hiệu lực
    const { startDate, endDate } = generateDefaultDateRange();
    
    // Tạo validator để kiểm tra mã
    const codeUniqueValidator = uniqueHHThiTruongCodeValidator(
      this.hangHoaService,
      () => this.form?.get('matHangChaId')?.value
    );

    this.form = this.fb.group({
      ma: ['', {
        validators: [
          Validators.required, 
          Validators.maxLength(25), 
          codeValidator()
        ],
        asyncValidators: [codeUniqueValidator],
        updateOn: 'blur'
      }],
      ten: ['', [Validators.required, Validators.maxLength(250)]],
      ghiChu: ['', Validators.maxLength(500)],
      ngayHieuLuc: [startDate, Validators.required],
      ngayHetHieuLuc: [endDate, Validators.required],
      loaiMatHang: [this.loai.Cha], // Mặc định là nhóm mặt hàng
      matHangChaId: [''],
      dacTinh: ['', Validators.maxLength(500)],
      donViTinhId: ['']
    }, {
      validators: [dateRangeValidator('ngayHieuLuc', 'ngayHetHieuLuc')]
    });

    // Cập nhật trạng thái ban đầu
    this.updateFormFieldsBasedOnType();
    
    // Lắng nghe sự thay đổi của trường matHangChaId để cập nhật validator
    this.form.get('matHangChaId')?.valueChanges.subscribe(() => {
      this.form.get('ma')?.updateValueAndValidity();
    });
  }

  // Xử lý khi toggle switch "Là hàng hóa / tài sản"
  toggleIsHangHoa(): void {
    this.isHangHoa = !this.isHangHoa;
    
    // Cập nhật loại mặt hàng trong form
    this.form.patchValue({
      loaiMatHang: this.isHangHoa ? this.loai.Con : this.loai.Cha
    });
    
    // Cập nhật validator
    this.updateFormFieldsBasedOnType();
    
    // Đợi DOM cập nhật xong, rồi mới cuộn xuống (cần setTimeout vì ngIf cần thời gian để render DOM)
    if (this.isHangHoa) {
      setTimeout(() => {
        this.scrollToBottom();
      }, 100);
    }
  }
  
  // Phương thức cuộn xuống cuối modal
  private scrollToBottom(): void {
    if (this.modalBody) {
      const element = this.modalBody.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }

  // Chỉ sửa phương thức updateFormFieldsBasedOnType để xử lý validation đúng cho matHangChaId

  /**
   * Cập nhật trạng thái các trường dựa trên loại mặt hàng (nhóm hoặc hàng hóa)
   * Nếu là loại Nhóm, không cần validate donViTinhId, dacTinh và matHangChaId
   * Nếu là loại Hàng hóa (hoặc tài sản), bắt buộc phải có donViTinhId và matHangChaId
   */
  private updateFormFieldsBasedOnType(): void {
    if (!this.isHangHoa) {
      // Nếu là nhóm mặt hàng, không cần đơn vị tính, đặc tính và mặt hàng cha
      this.form.get('donViTinhId')?.clearValidators();
      this.form.get('dacTinh')?.clearValidators();
      this.form.get('matHangChaId')?.clearValidators();
      
      // Cho phép nhập dacTinh tối đa 500 ký tự
      this.form.get('dacTinh')?.setValidators(Validators.maxLength(500));
    } else {
      // Nếu là hàng hóa, cần đơn vị tính và nhóm hàng hóa cha
      this.form.get('donViTinhId')?.setValidators(Validators.required);
      this.form.get('matHangChaId')?.setValidators(Validators.required);
      this.form.get('dacTinh')?.setValidators(Validators.maxLength(500));
    }

    // Cập nhật trạng thái của các trường
    this.form.get('donViTinhId')?.updateValueAndValidity();
    this.form.get('dacTinh')?.updateValueAndValidity();
    this.form.get('matHangChaId')?.updateValueAndValidity();
  }

  // Tải danh mục liên quan
  private loadDanhMucLienQuan(): void {
    // Chỉ tải danh sách nhóm mặt hàng nếu chưa được truyền vào
    if (this.nhomHangHoaList.length === 0) {
      this.hangHoaService.getAllParentCategories().subscribe(data => {
        this.nhomHangHoaList = data.map(item => ({ id: item.id, ten: item.ten }));
        this.setupSelectedNhomHangHoa();
      });
    } else {
      // Sử dụng dữ liệu đã được truyền vào
      this.setupSelectedNhomHangHoa();
    }

    // Nếu có donViTinhId từ trước, load thông tin đơn vị tính
    const donViTinhId = this.form.get('donViTinhId')?.value;
    if (donViTinhId) {
      this.donViTinhSelectionService.loadSelectedDonViTinh(donViTinhId, []).subscribe(result => {
        this.selectedDonViTinh = result;
      });
    }
  }

  /**
   * Thiết lập nhóm hàng hóa đã chọn
   */
  private setupSelectedNhomHangHoa(): void {
    const matHangChaId = this.form.get('matHangChaId')?.value;
    if (matHangChaId) {
      const found = this.nhomHangHoaList.find(item => item.id === matHangChaId);
      if (found) {
        this.selectedNhomHangHoa = found;
      }
    }
  }

  // Mở modal chọn đơn vị tính
  openDonViTinhModal(): void {
    this.iconFill = true;
    
    this.donViTinhSelectionService.openDonViTinhModal(
      this.form,
      (selectedUnit) => {
        this.iconFill = false;
        this.selectedDonViTinh = selectedUnit;
        this.form.patchValue({ donViTinhId: selectedUnit.id });
      }
    );
  }

  /**
   * Mở modal chọn nhóm hàng hóa
   */
  openNhomHangHoaModal(): void {
    this.nhomHangHoaIconFill = true;
    
    // Mở modal chọn nhóm hàng hóa
    const modalRef = this.modalService.open(NhomhhModalComponent, { 
      size: 'lg', 
      backdrop: 'static',
      keyboard: false
    });
    
    // Truyền dữ liệu vào modal
    modalRef.componentInstance.preSelectedId = this.form.get('matHangChaId')?.value;
    
    // Xử lý kết quả khi đóng modal
    modalRef.result.then(
      (result) => {
        if (result && result.id) {
          this.selectedNhomHangHoa = result;
          this.form.patchValue({ matHangChaId: result.id });
        }
        this.nhomHangHoaIconFill = false;
      },
      () => {
        this.nhomHangHoaIconFill = false;
      }
    );
  }

  /**
   * Xử lý khi lưu form thêm mới
   */
  save(): void {
    if (this.form.invalid) {
      this.markFormTouched();
      return;
    }

    this.submitting = true;
    
    // Chuyển đổi ngày từ NgbDateStruct sang chuỗi ISO
    const dateFields = ['ngayHieuLuc', 'ngayHetHieuLuc'];
    const formData = this.prepareFormData(dateFields);

    // Xử lý các trường ID để đảm bảo là null khi không có giá trị
    const parentId = formData.matHangChaId || null;
    formData.matHangChaId = parentId;
    formData.donViTinhId = formData.donViTinhId || null;

    // Gọi service để tạo mới
    this.hangHoaService.create(formData)
      .pipe(finalize(() => this.submitting = false))
      .subscribe({
        next: (response) => {
          if (response && response.data) {
            // Đóng modal và trả về kết quả với đầy đủ thông tin
            this.activeModal.close({
              item: response.data,
              parentId: parentId,
              success: true
            });
          } else {
            this.modalNotificationService.error('Không nhận được dữ liệu phản hồi từ máy chủ', 'Lỗi');
          }
        },
        error: (error) => {
          console.error('Lỗi khi thêm mới:', error);
          this.xulySaveError(error);
        }
      });
  }

  /**
   * Xử lý lỗi khi lưu
   */
  private xulySaveError(error: any): void {
    if (error.error?.errors) {
      const errorMessages = Object.values(error.error.errors).flat().join('\n');
      this.modalNotificationService.error(errorMessages, 'Lỗi');
    } else {
      this.modalNotificationService.error('Không thể thêm mới mặt hàng', 'Lỗi');
    }
  }

  // Chuẩn bị dữ liệu form trước khi gửi API
  protected override prepareFormData(dateFields: string[] = []): any {
    const formData = { ...this.form.value };
    
    // Chuyển đổi các trường ngày thành định dạng chuỗi ISO
    dateFields.forEach(field => {
      if (formData[field]) {
        formData[field] = dateStructToString(formData[field]);
      }
    });
    
    return formData;
  }

  // Hủy thao tác
  cancel(): void {
    if (this.formModified) {
      this.modalNotificationService.confirm('Bạn có thông tin chưa lưu. Bạn có chắc chắn muốn thoát?', 'Xác nhận thoát')
        .subscribe((confirmed) => {
          if (confirmed) {
            this.activeModal.dismiss('cancel');
          }
        });
    } else {
      this.activeModal.dismiss('cancel');
    }
  }
}