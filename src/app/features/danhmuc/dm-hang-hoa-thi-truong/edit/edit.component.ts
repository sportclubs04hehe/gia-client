import { Component, Input, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { DmThitruongService } from '../../services/dm-thitruong.service';
import { HangHoa } from '../../models/hanghoathitruong/dm-thitruong';
import { HangHoaUpdateDto } from '../../models/hanghoathitruong/hh-thitruong-update';
import { SharedModule } from '../../../../shared/shared.module';
import { FormComponentBase } from '../../../../shared/components/forms/forms-base/forms-base.component';
import { DateInputComponent } from '../../../../shared/components/forms/date-input/date-input.component';
import { dateRangeValidator, stringToDateStruct } from '../../../../core/formatters/date-range-validator';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-edit',
  standalone: true,
  imports: [
    SharedModule,
    DateInputComponent
  ],
  templateUrl: './edit.component.html',
  styleUrl: './edit.component.css'
})
export class EditComponent extends FormComponentBase implements OnInit {
  @Input() title = '';
  @Input() hangHoa!: HangHoa;

  activeModal = inject(NgbActiveModal);
  dmService = inject(DmThitruongService);
  toastrService = inject(ToastrService);

  // Add property to store original form values for comparison
  private originalFormValues: any;

  constructor(fb: FormBuilder) {
    super(fb);
  }

  ngOnInit(): void {
    this.buildForm();
    this.populateForm();
  }

  update() {
    if (this.form.invalid) {
      this.markFormTouched();
      return;
    }

    // Kiểm tra xem ID có tồn tại không trước khi tiếp tục
    if (!this.hangHoa.id) {
      console.error('Cannot update: Item ID is missing');
      return;
    }
    
    // Nhận giá trị biểu mẫu hiện tại với chuyển đổi ngày
    const formData = this.prepareFormData(['ngayHieuLuc', 'ngayHetHieuLuc']);
    
    // So sánh với giá trị ban đầu
    if (this.isFormUnchanged(formData)) {
      // Nếu không có gì thay đổi, hãy đóng modal mà không cần gọi API
      this.toastrService.success('Cập nhật mặt hàng thành công','Thành công');
      this.activeModal.close(false);
      return;
    }

    this.isSaving = true;

    this.dmService.update(this.hangHoa.id, formData as HangHoaUpdateDto).subscribe({
      next: () => {
        this.isSaving = false;
        this.activeModal.close(true);
      },
      error: () => {
        this.isSaving = false;
      }
    });
  }

  private isFormUnchanged(currentValues: any): boolean {
    for (const key in this.originalFormValues) {
      if (typeof this.originalFormValues[key] === 'object') continue;
      if (this.originalFormValues[key] !== currentValues[key]) {
        return false;
      }
    }
    return true;
  }

  cancel(): void {
    this.activeModal.dismiss();
  }

  protected buildForm(): void {
    this.form = this.fb.group({
      maMatHang: ['', Validators.required],
      tenMatHang: ['', Validators.required],
      ghiChu: [''],
      ngayHieuLuc: [null, Validators.required],
      ngayHetHieuLuc: [null, Validators.required],
      nhomHangHoaId: [null]
    }, {
      validators: dateRangeValidator('ngayHieuLuc', 'ngayHetHieuLuc') // Use imported validator
    });
  }

  private populateForm(): void {
    if (!this.hangHoa) return;
    
    // Convert dates to strings then to NgbDateStruct using utility function
    const ngayHieuLuc = stringToDateStruct(this.hangHoa.ngayHieuLuc ? this.hangHoa.ngayHieuLuc.toString() : null);
    const ngayHetHieuLuc = stringToDateStruct(this.hangHoa.ngayHetHieuLuc ? this.hangHoa.ngayHetHieuLuc.toString() : null);
    
    // Create the form values object
    const formValues = {
      maMatHang: this.hangHoa.maMatHang,
      tenMatHang: this.hangHoa.tenMatHang,
      ghiChu: this.hangHoa.ghiChu,
      ngayHieuLuc: ngayHieuLuc,
      ngayHetHieuLuc: ngayHetHieuLuc,
      nhomHangHoaId: this.hangHoa.nhomHangHoaId
    };
    
    // Update the form with these values
    this.form.patchValue(formValues);
    
    // Store the original values for later comparison, with dates converted to strings
    this.originalFormValues = this.prepareFormData(['ngayHieuLuc', 'ngayHetHieuLuc']);
  }
}
