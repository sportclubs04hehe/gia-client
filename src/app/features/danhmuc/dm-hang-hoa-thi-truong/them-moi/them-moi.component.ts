import { Component, ElementRef, EventEmitter, inject, OnInit, Output, Renderer2 } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { dateRangeValidator, generateDefaultDateRange } from '../../../../core/formatters/date-range-validator';
import { DmNhomHangHoaService } from '../../services/api/dm-nhom-hang-hoa.service';
import { DmThitruongService } from '../../services/api/dm-thitruong.service';
import { CreateNhomHangHoaDto } from '../../models/dm_nhomhanghoathitruong/CreateNhomHangHoaDto';
import { HangHoaCreateDto } from '../../models/dm_hanghoathitruong/hh-thitruong-create';
import { NhomHangHoaDto } from '../../models/dm_nhomhanghoathitruong/NhomHangHoaDto';
import { finalize } from 'rxjs';
import { BaseItemFormComponent } from './base-item-form.component';
import { SharedModule } from '../../../../shared/shared.module';
import { DateInputComponent } from '../../../../shared/components/forms/date-input/date-input.component';
import { TextInputComponent } from '../../../../shared/components/forms/text-input/text-input.component';
import { TruncatePipe } from '../../../../shared/pipes/truncate.pipe';
import { NhomHangHoaSelectionService } from '../../services/utils/nhom-hang-hoa-selection.service';
import { DonViTinhSelectionService } from '../../services/utils/don-vi-tinh-selection.service';
import { FormFooterComponent } from '../../../../shared/components/forms/form-footer/form-footer.component';

@Component({
  selector: 'app-them-moi',
  standalone: true,
  imports: [
    SharedModule,
    DateInputComponent,
    TextInputComponent,
    TruncatePipe,
    FormFooterComponent,
  ],
  templateUrl: './them-moi.component.html',
  styleUrls: ['./them-moi.component.css']
})
export class ThemMoiComponent extends BaseItemFormComponent implements OnInit {
  
  // Change the callback to include a type parameter
  onSaveCallback: ((data: any, isHangHoa: boolean) => void) | null = null;
  
  // Services
  private activeModal = inject(NgbActiveModal);
  private nhomHangHoaSvc = inject(DmNhomHangHoaService);
  private hangHoaSvc = inject(DmThitruongService);
  private nhomHangHoaSelectionService = inject(NhomHangHoaSelectionService);
  donViTinhSelectionService = inject(DonViTinhSelectionService);
  private elementRef = inject(ElementRef);
  
  isHangHoa = false; 
  isValidatingCode = false;
  iconFill = false;
  nhomHangHoaIconFill = false;
  
  // Selected items
  selectedNhomHangHoa: NhomHangHoaDto | null = null;
  selectedDonViTinh: any | null = null;
  
  constructor(protected override fb: FormBuilder) {
    super(fb);
    this.buildForm();
  }
  
  ngOnInit(): void {
    this.setDefaultDates();
  }

  toggleIsHangHoa(): void {
    this.isHangHoa = !this.isHangHoa;

    const nhomHangHoaIdControl = this.form.get('nhomHangHoaId');
    
    if (this.isHangHoa) {
      nhomHangHoaIdControl?.setValidators(Validators.required);

      this.form.addControl('donViTinhId', this.fb.control(null, Validators.required));
      this.form.addControl('dacTinh', this.fb.control(''));
      
      setTimeout(() => {
        this.scrollToBottom();
      }, 100);
    } else {
      nhomHangHoaIdControl?.clearValidators();
      
      this.form.removeControl('donViTinhId');
      this.form.removeControl('dacTinh');
    }
     
    nhomHangHoaIdControl?.updateValueAndValidity();
  }
  
  protected override buildForm(): void {
    this.form = this.fb.group({
      maMatHang: this.commonFields.ma,
      tenMatHang: this.commonFields.ten,
      ghiChu: this.commonFields.ghiChu,
      ngayHieuLuc: this.commonFields.ngayHieuLuc,
      ngayHetHieuLuc: this.commonFields.ngayHetHieuLuc,
      // Initialize without required validator - it will be added later if needed
      nhomHangHoaId: [null]
    }, {
      validators: [
        dateRangeValidator('ngayHieuLuc', 'ngayHetHieuLuc')
      ]
    });
  }
  
  save(): void {
    if (this.form.invalid) {
      this.markFormTouched();
      return;
    }
    
    this.isSaving = true;
    
    if (this.isHangHoa) {
      this.saveHangHoa();
    } else {
      this.saveNhomHangHoa();
    }
  }
  
  private saveHangHoa(): void {
    const dto: HangHoaCreateDto = this.prepareFormData([
      'ngayHieuLuc', 'ngayHetHieuLuc'
    ]);
    
    this.hangHoaSvc.add(dto)
      .pipe(finalize(() => this.isSaving = false))
      .subscribe({
        next: (response) => {
          this.toastr.success('Thêm hàng hóa thành công', 'Thành công');
          if (this.onSaveCallback) {
            this.onSaveCallback(response, true);
          }
          this.activeModal.close();
        },
        error: (error) => {
          const errorMsg = error.error?.message || 'Không thể thêm hàng hóa';
          this.toastr.error(errorMsg, 'Lỗi');
        }
      });
  }
  
  private saveNhomHangHoa(): void {
    const formData = this.prepareFormData(['ngayHieuLuc', 'ngayHetHieuLuc']);
    
    const dto: CreateNhomHangHoaDto = {
      maNhom: formData.maMatHang,
      tenNhom: formData.tenMatHang,
      ghiChu: formData.ghiChu,
      ngayHieuLuc: formData.ngayHieuLuc,
      ngayHetHieuLuc: formData.ngayHetHieuLuc,
      nhomChaId: formData.nhomHangHoaId || undefined
    };
    
    this.nhomHangHoaSvc.create(dto)
      .pipe(finalize(() => this.isSaving = false))
      .subscribe({
        next: (response) => {
          this.toastr.success('Thêm nhóm hàng hóa thành công', 'Thành công');
          if (this.onSaveCallback) {
            this.onSaveCallback(response, false);
          }
          this.activeModal.close();
        },
        error: (error) => {
          const errorMsg = error.error?.message || 'Không thể thêm nhóm hàng hóa';
          this.toastr.error(errorMsg, 'Lỗi');
        }
      });
  }
  
  cancel(): void {
    this.activeModal.dismiss();
  }
  
 openNhomHangHoaModal(): void {
    this.nhomHangHoaIconFill = true;

    const modalRef = this.nhomHangHoaSelectionService.openNhomHangHoaModal(this.form, (group) => {
      this.selectedNhomHangHoa = group;
      this.form.get('nhomHangHoaId')?.setValue(group.id);
      this.form.get('nhomHangHoaId')?.markAsDirty();

      this.nhomHangHoaIconFill = false;
    });

    modalRef.dismissed.subscribe(() => {
      this.nhomHangHoaIconFill = false;
    });
  }
  
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
  
  private scrollToBottom(): void {
    const modalBody = this.elementRef.nativeElement.querySelector('.modal-body');
    if (modalBody) {
      modalBody.scrollTop = modalBody.scrollHeight;
    }
  }
  
  setDefaultDates(): void {
    const { startDate, endDate } = generateDefaultDateRange(5);
    
    this.form.patchValue({
      ngayHieuLuc: startDate,
      ngayHetHieuLuc: endDate
    });
  }
}
