import { Component, OnInit, inject, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TextInputComponent } from '../../../../shared/components/forms/text-input/text-input.component';
import { DateInputComponent } from '../../../../shared/components/forms/date-input/date-input.component';
import { DmHangHoaThiTruongService } from '../../services/api/dm-hang-hoa-thi-truong.service';
import { HHThiTruongDto, LoaiMatHangEnum } from '../../models/dm-hh-thitruong/HHThiTruongDto';
import { dateRangeValidator, stringToDateStruct } from '../../../../core/formatters/date-range-validator';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { FormComponentBase } from '../../../../shared/components/forms/forms-base/forms-base.component';
import { DonViTinhSelectionService } from '../../services/utils/don-vi-tinh-selection.service';
import { DonViTinhSelectDto } from '../../models/dm_donvitinh/don-vi-tinh-select.dto';
import { NhomhhModalComponent } from '../nhomhh-modal/nhomhh-modal.component';
import { ModalNotificationService } from '../../../../shared/components/notifications/modal-notification/modal-notification.service';
import { FormFooterComponent } from '../../../../shared/components/forms/form-footer/form-footer.component';
import { CodeInputDirective } from '../../helpers/code-input.directive';
import { codeValidator } from '../../helpers/code-validator';

@Component({
  selector: 'app-sua',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TextInputComponent,
    DateInputComponent,
    FormFooterComponent,
    CodeInputDirective
  ],
  templateUrl: './sua.component.html',
  styleUrl: './sua.component.css'
})
export class SuaComponent extends FormComponentBase implements OnInit {
  // Reference đến modal-body để điều khiển scroll
  @ViewChild('modalBody', { static: false }) modalBody?: ElementRef;

  activeModal = inject(NgbActiveModal);
  hangHoaService = inject(DmHangHoaThiTruongService);
  donViTinhSelectionService = inject(DonViTinhSelectionService);
  private modalService = inject(NgbModal);
  modalNotificationService = inject(ModalNotificationService);

  title = 'Chỉnh sửa hàng hóa thị trường';
  submitting = false;
  loaiMatHangEnum = LoaiMatHangEnum;
  formModified = false;
  
  // Thông tin mặt hàng đang chỉnh sửa
  editingItem!: HHThiTruongDto;
  
  // Biến theo dõi trạng thái là hàng hóa/tài sản hay nhóm
  isHangHoa = false;
  
  // Thông tin đơn vị tính và nhóm hàng hóa được chọn
  selectedDonViTinh: DonViTinhSelectDto | null = null;
  selectedNhomHangHoa: { id: string, ten: string } | null = null;
  
  // Trạng thái icon khi focus vào ô chọn
  iconFill = false;
  nhomHangHoaIconFill = false;
  
  constructor(protected override fb: FormBuilder) {
    super(fb);
  }

  ngOnInit(): void {
    if (!this.editingItem) {
      console.error('Không có dữ liệu mặt hàng để chỉnh sửa');
      this.cancel();
      return;
    }
    
    // Xác định loại mặt hàng
    this.isHangHoa = this.editingItem.loaiMatHang === LoaiMatHangEnum.HangHoa;
    
    // Khởi tạo form và dữ liệu liên quan
    this.buildForm();
    
    // Listen for form changes
    this.form.valueChanges.subscribe(() => {
      this.formModified = true;
    });
  }

  /**
   * Khởi tạo form với dữ liệu có sẵn từ mặt hàng đang chỉnh sửa
   */
  protected buildForm(): void {
    this.form = this.fb.group({
      id: [this.editingItem.id], // Trường id cần thiết cho việc cập nhật
      ma: [this.editingItem.ma, [
        Validators.required, 
        Validators.maxLength(25), 
        codeValidator()
      ]],
      ten: [this.editingItem.ten, [Validators.required, Validators.maxLength(250)]],
      ghiChu: [this.editingItem.ghiChu || '', Validators.maxLength(500)],
      ngayHieuLuc: [stringToDateStruct(this.editingItem.ngayHieuLuc), Validators.required],
      ngayHetHieuLuc: [stringToDateStruct(this.editingItem.ngayHetHieuLuc), Validators.required],
      loaiMatHang: [this.editingItem.loaiMatHang],
      matHangChaId: [this.editingItem.matHangChaId || ''],
      dacTinh: [this.editingItem.dacTinh || '', Validators.maxLength(500)],
      donViTinhId: [this.editingItem.donViTinhId || '']
    }, {
      validators: [dateRangeValidator('ngayHieuLuc', 'ngayHetHieuLuc')]
    });

    // Khởi tạo các giá trị cho mục đã chọn
    if (this.editingItem.matHangChaId) {
      this.selectedNhomHangHoa = {
        id: this.editingItem.matHangChaId,
        ten: this.editingItem.tenMatHangCha || ''
      };
    }

    if (this.editingItem.donViTinhId && this.editingItem.tenDonViTinh) {
      // Thêm thuộc tính 'ma' theo yêu cầu của DonViTinhSelectDto
      this.selectedDonViTinh = {
        id: this.editingItem.donViTinhId,
        ten: this.editingItem.tenDonViTinh || '',
        ma: '' // Gán giá trị mặc định nếu không có
      };
    }

    // Cập nhật validator dựa trên loại mặt hàng
    this.updateFormFieldsBasedOnType();
  }

  /**
   * Xử lý khi toggle switch "Là hàng hóa / tài sản"
   */
  toggleIsHangHoa(): void {
    this.isHangHoa = !this.isHangHoa;
    
    // Cập nhật loại mặt hàng trong form
    this.form.patchValue({
      loaiMatHang: this.isHangHoa ? LoaiMatHangEnum.HangHoa : LoaiMatHangEnum.Nhom
    });
    
    // Cập nhật validator
    this.updateFormFieldsBasedOnType();
    
    // Cuộn xuống để hiển thị các trường bổ sung khi chuyển sang hàng hóa
    if (this.isHangHoa) {
      setTimeout(() => this.scrollToBottom(), 100);
    }
  }
  
  /**
   * Cuộn xuống cuối modal để người dùng thấy các trường mới hiện ra
   */
  private scrollToBottom(): void {
    if (this.modalBody) {
      const element = this.modalBody.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }

  /**
   * Cập nhật trạng thái validator của các trường dựa trên loại mặt hàng
   */
  private updateFormFieldsBasedOnType(): void {
    if (!this.isHangHoa) {
      // Nếu là nhóm mặt hàng, bỏ validator bắt buộc
      this.form.get('donViTinhId')?.clearValidators();
      this.form.get('matHangChaId')?.clearValidators();
    } else {
      // Nếu là hàng hóa, bắt buộc phải có đơn vị tính và nhóm hàng hóa cha
      this.form.get('donViTinhId')?.setValidators(Validators.required);
      this.form.get('matHangChaId')?.setValidators(Validators.required);
    }
    
    // Luôn giữ validator maxLength cho dacTinh
    this.form.get('dacTinh')?.setValidators(Validators.maxLength(500));

    // Cập nhật trạng thái validator
    this.form.get('donViTinhId')?.updateValueAndValidity();
    this.form.get('dacTinh')?.updateValueAndValidity();
    this.form.get('matHangChaId')?.updateValueAndValidity();
  }

  /**
   * Mở modal chọn đơn vị tính
   */
  openDonViTinhModal(): void {
    this.iconFill = true;
    
    this.donViTinhSelectionService.openDonViTinhModal(
      this.form,
      (selectedUnit) => {
        this.iconFill = false;
        this.selectedDonViTinh = selectedUnit; // selectedUnit đã đủ thuộc tính 'ma' từ service
        this.form.patchValue({ donViTinhId: selectedUnit.id });
      }
    );
  }

  /**
   * Mở modal chọn nhóm hàng hóa - tối ưu để không tải danh sách khi không cần thiết
   */
  openNhomHangHoaModal(): void {
    this.nhomHangHoaIconFill = true;
    
    // Hiển thị spinner trong khi tải dữ liệu
    const modalRef = this.modalService.open(NhomhhModalComponent, { 
      size: 'lg', 
      backdrop: 'static',
      keyboard: false
    });
    
    // Truyền ID nhóm đã chọn vào modal
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
   * Kiểm tra trạng thái lỗi của control
   */
  isControlInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  /**
   * Xử lý lưu form cập nhật
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
    if (!formData.matHangChaId) formData.matHangChaId = null;
    if (!formData.donViTinhId) formData.donViTinhId = null;

    // Lấy id từ form để truyền riêng vào phương thức update
    const id = formData.id;
    
    // Gọi service để cập nhật - truyền 2 tham số theo yêu cầu của API
    this.hangHoaService.update(id, formData)
      .pipe(finalize(() => this.submitting = false))
      .subscribe({
        next: () => this.activeModal.close('saved'),
        error: (error) => {
          console.error('Lỗi API:', error);
          
          // Xử lý thông báo lỗi từ API
          if (error.error?.errors) {
            const errorMessages = Object.values(error.error.errors).flat().join('\n');
            console.error('Thông báo lỗi:', errorMessages);
          }
        }
      });
  }

  /**
   * Hủy thao tác chỉnh sửa
   */
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
