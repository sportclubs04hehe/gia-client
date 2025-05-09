import { Component, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal, NgbCalendar, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { HangHoaCreateDto } from '../../models/dm_hanghoathitruong/hh-thitruong-create';
import { SharedModule } from '../../../../shared/shared.module';
import { dateRangeValidator } from '../../../../core/formatters/date-range-validator';
import { DateInputComponent } from '../../../../shared/components/forms/date-input/date-input.component';
import { FormComponentBase } from '../../../../shared/components/forms/forms-base/forms-base.component';
import { DmThitruongService } from '../../services/dm-thitruong.service';
import { uniqueItemCodeValidator } from '../../utils/unique-ma-mat-hang';
import { TextInputComponent } from '../../../../shared/components/forms/text-input/text-input.component';
import { DonViTinhSelectDto } from '../../models/dm_donvitinh/don-vi-tinh-select.dto';
import { TruncatePipe } from '../../../../shared/pipes/truncate.pipe';
import { ModalNotificationService } from '../../../../shared/components/notifications/modal-notification/modal-notification.service';
import { DonViTinhSelectionService } from '../../services/don-vi-tinh-selection.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-them-moi',
  standalone: true,
  imports: [
    SharedModule,
    DateInputComponent,
    TextInputComponent,
    TruncatePipe,
  ],
  templateUrl: './them-moi.component.html',
  styleUrl: './them-moi.component.css'
})
export class ThemMoiComponent extends FormComponentBase implements OnInit, OnDestroy {
  activeModal = inject(NgbActiveModal);
  calendar = inject(NgbCalendar);
  dmService = inject(DmThitruongService);
  notificationService = inject(ModalNotificationService);
  donViTinhSelectionService = inject(DonViTinhSelectionService);

  selectedDonViTinh: DonViTinhSelectDto | null = null;

  @Input() title: string = '';
  @Input() onSave!: (dto: HangHoaCreateDto) => void;

  today!: NgbDateStruct;
  defaultNgayHetHieuLuc!: NgbDateStruct;
  donViTinhList: DonViTinhSelectDto[] = [];
  iconFill = false;
  isLoadingDonViTinh = false;

  // Add a property to track initial form values
  initialFormValue: any;
  private searchSubscription: Subscription | null = null;

  constructor(fb: FormBuilder) {
    super(fb);
  }

  ngOnInit(): void {
    this.setDefaultDates();
    this.buildForm();

    // Store initial form value to track changes
    this.initialFormValue = this.form.value;

    // Subscribe to the search stream from the service
    this.searchSubscription = this.donViTinhSelectionService
      .setupDonViTinhSearchStream()
      .subscribe({
        next: result => {
          this.donViTinhList = result.data;
          this.isLoadingDonViTinh = false;
        },
        error: error => {
          console.error('Error in DonViTinh search stream:', error);
          this.isLoadingDonViTinh = false;
        }
      });

    this.form.get('donViTinhId')?.valueChanges.subscribe(id => {
      if (id) this.loadSelectedDonViTinh(id);
      else this.selectedDonViTinh = null;
    });
  }

  override ngOnDestroy(): void {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
    super.ngOnDestroy();
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

    this.onSave(formData as HangHoaCreateDto);
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
      maMatHang: ['', {
        validators: [Validators.required, Validators.maxLength(50)],
        asyncValidators: [uniqueItemCodeValidator(this.dmService, null)],
        updateOn: 'blur'
      }],
      tenMatHang: ['', [Validators.required, Validators.maxLength(200)]],
      ghiChu: [''],
      ngayHieuLuc: [this.today, Validators.required],
      ngayHetHieuLuc: [this.defaultNgayHetHieuLuc, Validators.required],
      nhomHangHoaId: [null],
      donViTinhId: [null, Validators.required]
    }, {
      validators: dateRangeValidator('ngayHieuLuc', 'ngayHetHieuLuc')
    });
  }

  // Use the service to load the selected unit
  loadSelectedDonViTinh(id: string): void {
    this.donViTinhSelectionService.loadSelectedDonViTinh(id, this.donViTinhList)
      .subscribe(unit => {
        this.selectedDonViTinh = unit;
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

  // Use the service to open the modal
  openDonViTinhModal(): void {
    this.iconFill = true;
    this.isLoadingDonViTinh = true;
    
    this.donViTinhSelectionService.openDonViTinhModal(
      this.form, 
      (selectedUnit) => {
        this.iconFill = false;
        this.selectedDonViTinh = selectedUnit;
        this.form.patchValue({ donViTinhId: selectedUnit.id });
      }
    );
  }

  // Helper method to check if control is invalid (for template)
  isControlInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }
}
