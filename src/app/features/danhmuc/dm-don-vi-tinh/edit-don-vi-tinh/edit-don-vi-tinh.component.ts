import { Component, inject, Input, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { FormComponentBase } from '../../../../shared/components/forms/forms-base/forms-base.component';
import { TextInputComponent } from '../../../../shared/components/forms/text-input/text-input.component';
import { SharedModule } from '../../../../shared/shared.module';
import { DonViTinhDto } from '../../models/dm_donvitinh/don-ti-tinh.dto';
import { DonViTinhUpdateDto } from '../../models/dm_donvitinh/don-vi-tinh_update.dto';
import { DmDonViTinhService } from '../../services/dm-don-vi-tinh.service';
import { uniqueDonViTinhCodeValidator } from '../../utils/unique-madonvitinh';

@Component({
  selector: 'app-edit-don-vi-tinh',
  standalone: true,
  imports: [
    SharedModule,
    TextInputComponent
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
    if (!this.donViTinh.id) { 
      console.error('Missing ID'); 
      return; 
    }

    const formData = this.prepareFormData();
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
          this.toastrService.success('Thêm mới thành công', 'Thành công');
          this.activeModal.close(resp.data);
        },
        error: err => {
          this.isSaving = false;
          this.toastrService.error(err.message || 'Lỗi khi cập nhật');
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
      ma: ['', {
        validators: [Validators.required],
        asyncValidators: [uniqueDonViTinhCodeValidator(
          this.donViTinhService, 
          this.donViTinh?.ma,
          this.donViTinh?.id  // Pass the ID to exclude
        )],
        updateOn: 'blur'
      }],
      ten: ['', Validators.required],
      ghiChu: ['']
    });
  }

  private populateForm(): void {
    if (!this.donViTinh) return;

    const formValues = {
      ma: this.donViTinh.ma,
      ten: this.donViTinh.ten,
      ghiChu: this.donViTinh.ghiChu
    };

    this.form.patchValue(formValues);
    this.originalFormValues = { ...formValues };
  }

  preventSpaces(event: KeyboardEvent) {
    if (event.key === ' ') {
      event.preventDefault();
    }
  }

  get isValidatingCode(): boolean {
    const control = this.form?.get('ma');
    return control?.pending === true;
  }
}
