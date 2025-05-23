import { Component, Input, OnInit, inject } from '@angular/core';
import { SharedModule } from '../../../../shared/shared.module';
import { TextInputComponent } from '../../../../shared/components/forms/text-input/text-input.component';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { FormComponentBase } from '../../../../shared/components/forms/forms-base/forms-base.component';
import { DonViTinhCreateDto } from '../../models/dm_donvitinh/don-vi-tinh_create.dto';
import { uniqueDonViTinhCodeValidator } from '../../utils/unique-madonvitinh';
import { DateInputComponent } from '../../../../shared/components/forms/date-input/date-input.component';
import { dateRangeValidator, generateDefaultDateRange } from '../../../../core/formatters/date-range-validator';
import { ModalNotificationService } from '../../../../shared/components/notifications/modal-notification/modal-notification.service';
import { DmDonViTinhService } from '../../services/api/dm-don-vi-tinh.service';

@Component({
  selector: 'app-add-don-vi-tinh',
  standalone: true,
  imports: [
    SharedModule,
    TextInputComponent,
    DateInputComponent,
  ],
  templateUrl: './add-don-vi-tinh.component.html',
  styleUrl: './add-don-vi-tinh.component.css'
})
export class AddDonViTinhComponent extends FormComponentBase implements OnInit {
  activeModal = inject(NgbActiveModal);
  donViTinhService = inject(DmDonViTinhService);
  notificationService = inject(ModalNotificationService);

  @Input() title: string = '';
  @Input() onSave!: (dto: DonViTinhCreateDto) => void;

  today!: NgbDateStruct;
  defaultNgayHetHieuLuc!: NgbDateStruct;

  // Add a property to track initial form values
  initialFormValue: any;

  constructor(fb: FormBuilder) {
    super(fb);
  }

  ngOnInit(): void {
    this.buildForm();       // Đặt buildForm() trước
    this.setDefaultDates(); // Sau đó mới gọi setDefaultDates()
    
    // Store initial form value to track changes
    this.initialFormValue = this.form.value;
  }

  // Check if form has unsaved changes
  hasUnsavedChanges(): boolean {
    const currentValue = JSON.stringify(this.form.value);
    const initialValue = JSON.stringify(this.initialFormValue);
    return currentValue !== initialValue && !this.form.pristine;
  }

  save(): void {
    if (this.form.invalid) {
      this.markFormTouched();
      return;
    }

    const formData = this.prepareFormData(['ngayHieuLuc', 'ngayHetHieuLuc']);

    this.onSave(formData as DonViTinhCreateDto);
    this.activeModal.close();
  }

  cancel(): void {
    if (this.hasUnsavedChanges()) {
      this.notificationService.warning(
        'Dữ liệu chưa được lưu. Bạn có chắc chắn muốn thoát không?',
        'Xác nhận thoát'
      ).subscribe(confirmed => {
        if (confirmed) {
          this.activeModal.dismiss();
        }
      });
    } else {
      this.activeModal.dismiss();
    }
  }

  protected buildForm(): void {
    this.form = this.fb.group({
      ma: ['', {
        validators: [Validators.required],
        asyncValidators: [uniqueDonViTinhCodeValidator(this.donViTinhService, null)],
        updateOn: 'blur'
      }],
      ten: ['', Validators.required],
      ghiChu: [''],
      ngayHieuLuc: [this.today, Validators.required],
      ngayHetHieuLuc: [this.defaultNgayHetHieuLuc, Validators.required]
    }, {
      validators: dateRangeValidator('ngayHieuLuc', 'ngayHetHieuLuc')
    });
  }

  get isValidatingCode(): boolean {
    const control = this.form?.get('ma');
    return control?.pending === true;
  }

  setDefaultDates(): void {
    const { startDate, endDate } = generateDefaultDateRange(5);

    this.form.patchValue({
      ngayHieuLuc: startDate,
      ngayHetHieuLuc: endDate
    });
  }
  
}
