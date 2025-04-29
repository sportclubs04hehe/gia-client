import { Component, Input, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal, NgbCalendar, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { HangHoaCreateDto } from '../../models/hanghoathitruong/hh-thitruong-create';
import { SharedModule } from '../../../../shared/shared.module';
import { dateRangeValidator } from '../../../../core/formatters/date-range-validator';
import { DateInputComponent } from '../../../../shared/components/forms/date-input/date-input.component';
import { FormComponentBase } from '../../../../shared/components/forms/forms-base/forms-base.component';
import { DmThitruongService } from '../../services/dm-thitruong.service';
import { uniqueItemCodeValidator } from '../../utils/validate-ma-mat-hang';
@Component({
  selector: 'app-them-moi',
  standalone: true,
  imports: [
    SharedModule,
    DateInputComponent  
  ],
  templateUrl: './them-moi.component.html',
  styleUrl: './them-moi.component.css'
})
export class ThemMoiComponent extends FormComponentBase implements OnInit {
  activeModal = inject(NgbActiveModal);
  calendar = inject(NgbCalendar);
  dmService = inject(DmThitruongService);

  @Input() title: string = '';
  @Input() onSave!: (dto: HangHoaCreateDto) => void;

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
    
    this.onSave(formData as HangHoaCreateDto);
    this.activeModal.close();
  }

  cancel(): void {
    this.activeModal.dismiss();
  }

  protected buildForm(): void {
    this.form = this.fb.group({
      maMatHang: ['', {
        validators: [Validators.required],
        asyncValidators: [uniqueItemCodeValidator(this.dmService, null)],
        updateOn: 'blur'
      }],
      tenMatHang: ['', Validators.required],
      ghiChu: [''],
      ngayHieuLuc: [this.today, Validators.required],
      ngayHetHieuLuc: [this.defaultNgayHetHieuLuc, Validators.required],
      nhomHangHoaId: null
    }, {
      validators: dateRangeValidator('ngayHieuLuc', 'ngayHetHieuLuc')
    });
  }

  get isValidatingCode(): boolean {
    const control = this.form?.get('maMatHang');
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
