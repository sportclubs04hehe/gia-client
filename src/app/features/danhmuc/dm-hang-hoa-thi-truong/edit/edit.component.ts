import { Component, Input, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { DmThitruongService } from '../../services/dm-thitruong.service';
import { HangHoa } from '../../models/dm_hanghoathitruong/dm-thitruong';
import { HangHoaUpdateDto } from '../../models/dm_hanghoathitruong/hh-thitruong-update';
import { SharedModule } from '../../../../shared/shared.module';
import { FormComponentBase } from '../../../../shared/components/forms/forms-base/forms-base.component';
import { DateInputComponent } from '../../../../shared/components/forms/date-input/date-input.component';
import { dateRangeValidator, stringToDateStruct } from '../../../../core/formatters/date-range-validator';
import { ToastrService } from 'ngx-toastr';
import { uniqueItemCodeValidator } from '../../utils/unique-ma-mat-hang';
import { TextInputComponent } from '../../../../shared/components/forms/text-input/text-input.component';

@Component({
  selector: 'app-edit',
  standalone: true,
  imports: [
    SharedModule,
    DateInputComponent,
    TextInputComponent
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

  private originalFormValues: any;

  constructor(fb: FormBuilder) {
    super(fb);
  }

  ngOnInit(): void {
    this.buildForm();
    this.populateForm();
  }

  // edit.component.ts

  update() {
    if (this.form.invalid) {
      this.markFormTouched();
      return;
    }
    if (!this.hangHoa.id) { console.error('Missing ID'); return; }

    const formData = this.prepareFormData(['ngayHieuLuc', 'ngayHetHieuLuc']);
    if (this.isFormUnchanged(formData)) {
      this.toastrService.success('Không có thay đổi', 'Thông báo');
      this.activeModal.close(false);
      return;
    }

    this.isSaving = true;

    this.dmService.update(this.hangHoa.id, formData as HangHoaUpdateDto)
      .subscribe({
        next: resp => {
          this.isSaving = false;
          // show thông báo từ API
          this.toastrService.success(resp.message, resp.title);
          // trả về đúng entity
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
      maMatHang: ['', {
        validators: [Validators.required],
        asyncValidators: [uniqueItemCodeValidator(this.dmService, this.hangHoa?.maMatHang)],
        updateOn: 'blur'
      }],
      tenMatHang: ['', Validators.required],
      ghiChu: [''],
      ngayHieuLuc: [null, Validators.required],
      ngayHetHieuLuc: [null, Validators.required],
      nhomHangHoaId: [null]
    }, {
      validators: dateRangeValidator('ngayHieuLuc', 'ngayHetHieuLuc')
    });
  }

  private populateForm(): void {
    if (!this.hangHoa) return;

    const ngayHieuLuc = stringToDateStruct(this.hangHoa.ngayHieuLuc ? this.hangHoa.ngayHieuLuc.toString() : null);
    const ngayHetHieuLuc = stringToDateStruct(this.hangHoa.ngayHetHieuLuc ? this.hangHoa.ngayHetHieuLuc.toString() : null);

    const formValues = {
      maMatHang: this.hangHoa.maMatHang,
      tenMatHang: this.hangHoa.tenMatHang,
      ghiChu: this.hangHoa.ghiChu,
      ngayHieuLuc: ngayHieuLuc,
      ngayHetHieuLuc: ngayHetHieuLuc,
      nhomHangHoaId: this.hangHoa.nhomHangHoaId
    };

    this.form.patchValue(formValues);

    this.originalFormValues = this.prepareFormData(['ngayHieuLuc', 'ngayHetHieuLuc']);
  }

  preventSpaces(event: KeyboardEvent) {
    if (event.key === ' ') {
      event.preventDefault();
    }
  }

  get isValidatingCode(): boolean {
    const control = this.form?.get('maMatHang');
    return control?.pending === true;
  }
}
