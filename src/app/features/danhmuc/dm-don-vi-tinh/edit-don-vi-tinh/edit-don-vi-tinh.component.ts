import { Component, inject, Input, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal, NgbCalendar, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { FormComponentBase } from '../../../../shared/components/forms/forms-base/forms-base.component';
import { TextInputComponent } from '../../../../shared/components/forms/text-input/text-input.component';
import { DateInputComponent } from '../../../../shared/components/forms/date-input/date-input.component';
import { SharedModule } from '../../../../shared/shared.module';
import { DonViTinhDto } from '../../models/dm_donvitinh/don-ti-tinh.dto';
import { DonViTinhUpdateDto } from '../../models/dm_donvitinh/don-vi-tinh_update.dto';
import { uniqueDonViTinhCodeValidator } from '../../utils/unique-madonvitinh';
import { ModalNotificationService } from '../../../../shared/components/notifications/modal-notification/modal-notification.service';
import { dateRangeValidator, stringToDateStruct } from '../../../../core/formatters/date-range-validator';
import { DmDonViTinhService } from '../../services/api/dm-don-vi-tinh.service';
import { CodeInputDirective } from '../../utils/code-input.directive';
import { codeValidator } from '../../utils/code-validator';

@Component({
  selector: 'app-edit-don-vi-tinh',
  standalone: true,
  imports: [
    SharedModule,
    TextInputComponent,
    DateInputComponent,
    CodeInputDirective
  ],
  templateUrl: './edit-don-vi-tinh.component.html',
  styleUrl: './edit-don-vi-tinh.component.css'
})
export class EditDonViTinhComponent extends FormComponentBase implements OnInit {
  @Input() title = '';
  @Input() donViTinh!: DonViTinhDto;

  activeModal = inject(NgbActiveModal);
  donViTinhService = inject(DmDonViTinhService);
  toastrService = inject(ToastrService);
  notificationService = inject(ModalNotificationService);
  calendar = inject(NgbCalendar);

  private originalFormValues: any;
  today!: NgbDateStruct;
  defaultNgayHetHieuLuc!: NgbDateStruct;

  constructor(fb: FormBuilder) {
    super(fb);
  }

  ngOnInit(): void {
    this.buildForm();
    this.populateForm();
  }

  private isFormUnchanged(formData: any): boolean {
    if (!this.originalFormValues) return false;

    return JSON.stringify(this.originalFormValues) === JSON.stringify(formData);
  }

  hasUnsavedChanges(): boolean {
  const currentFormData = this.prepareFormData(['ngayHieuLuc', 'ngayHetHieuLuc']);
  return !this.isFormUnchanged(currentFormData);
}

  update() {
    if (this.form.invalid) {
      this.markFormTouched();
      return;
    }
    if (!this.donViTinh.id) {
      console.error('Missing ID');
      return;
    }

    const formData = this.prepareFormData(['ngayHieuLuc', 'ngayHetHieuLuc']);
    if (this.isFormUnchanged(formData)) {
      this.toastrService.success('Không có thay đổi', 'Thông báo');
      this.activeModal.close(false);
      return;
    }

    this.isSaving = true;

    this.donViTinhService.update(this.donViTinh.id, formData as DonViTinhUpdateDto)
      .subscribe({
        next: resp => {
          this.isSaving = false;
          this.toastrService.success('Cập nhật thành công', 'Thành công');
          this.activeModal.close(resp.data);
        },
        error: err => {
          this.isSaving = false;
          this.toastrService.error(err.message || 'Lỗi khi cập nhật');
        }
      });
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
        validators: [
          Validators.required,
          codeValidator(),
          Validators.maxLength(25)
        ],
        asyncValidators: [uniqueDonViTinhCodeValidator(
          this.donViTinhService,
          this.donViTinh?.ma,
          this.donViTinh?.id
        )],
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

  private populateForm(): void {
    if (!this.donViTinh) return;

    const formValues = {
      ma: this.donViTinh.ma,
      ten: this.donViTinh.ten,
      ghiChu: this.donViTinh.ghiChu,
      ngayHieuLuc: stringToDateStruct(this.donViTinh.ngayHieuLuc) || this.today,
      ngayHetHieuLuc: stringToDateStruct(this.donViTinh.ngayHetHieuLuc) || this.defaultNgayHetHieuLuc
    };

    this.form.patchValue(formValues);

    // Store the form values directly from the form after patching
    // This will match the format returned by form.getRawValue()
    this.originalFormValues = this.prepareFormData(['ngayHieuLuc', 'ngayHetHieuLuc']);
  }

  get isValidatingCode(): boolean {
    const control = this.form?.get('ma');
    return control?.pending === true;
  }
}
