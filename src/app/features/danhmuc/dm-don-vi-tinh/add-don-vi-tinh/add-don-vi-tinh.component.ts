import { Component, Input, OnInit, inject } from '@angular/core';
import { SharedModule } from '../../../../shared/shared.module';
import { TextInputComponent } from '../../../../shared/components/forms/text-input/text-input.component';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal, NgbCalendar, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { FormComponentBase } from '../../../../shared/components/forms/forms-base/forms-base.component';
import { DonViTinhCreateDto } from '../../models/dm_donvitinh/don-vi-tinh_create.dto';
import { DmDonViTinhService } from '../../services/dm-don-vi-tinh.service';
import { uniqueDonViTinhCodeValidator } from '../../utils/unique-madonvitinh';
import { DateInputComponent } from '../../../../shared/components/forms/date-input/date-input.component';
import { dateRangeValidator } from '../../../../core/formatters/date-range-validator';

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
export class ThemMoiDonViTinhComponent extends FormComponentBase implements OnInit {
  activeModal = inject(NgbActiveModal);
  donViTinhService = inject(DmDonViTinhService);
  calendar = inject(NgbCalendar);

  @Input() title: string = '';
  @Input() onSave!: (dto: DonViTinhCreateDto) => void;

  today!: NgbDateStruct;
  defaultNgayHetHieuLuc!: NgbDateStruct;

  constructor(fb: FormBuilder) {
    super(fb);
  }

  ngOnInit(): void {
    this.setDefaultDates();
    this.buildForm();
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
    this.activeModal.dismiss();
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

  private setDefaultDates(): void {
    this.today = this.calendar.getToday();
    this.defaultNgayHetHieuLuc = {
      year: this.today.year + 5,
      month: this.today.month,
      day: this.today.day
    };
  }

  preventSpaces(event: KeyboardEvent) {
    if (event.key === ' ') {
      event.preventDefault();
    }
  }
}
