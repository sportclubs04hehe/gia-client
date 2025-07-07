import { Component, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { DmThitruongService } from '../../services/api/dm-thitruong.service';
import { HangHoa } from '../../models/dm_hanghoathitruong/dm-thitruong';
import { HangHoaUpdateDto } from '../../models/dm_hanghoathitruong/hh-thitruong-update';
import { SharedModule } from '../../../../shared/shared.module';
import { FormComponentBase } from '../../../../shared/components/forms/forms-base/forms-base.component';
import { DateInputComponent } from '../../../../shared/components/forms/date-input/date-input.component';
import { dateRangeValidator, stringToDateStruct } from '../../../../core/formatters/date-range-validator';
import { ToastrService } from 'ngx-toastr';
import { uniqueItemCodeValidator } from '../../helpers/unique-ma-mat-hang';
import { TextInputComponent } from '../../../../shared/components/forms/text-input/text-input.component';
import { DonViTinhSelectDto } from '../../models/dm_donvitinh/don-vi-tinh-select.dto';
import { TruncatePipe } from '../../../../shared/pipes/truncate.pipe';
import { Subscription } from 'rxjs';
import { DonViTinhSelectionService } from '../../services/utils/don-vi-tinh-selection.service';
import { ModalNotificationService } from '../../../../shared/components/notifications/modal-notification/modal-notification.service';
import { DmDonViTinhService } from '../../services/api/dm-don-vi-tinh.service';

@Component({
  selector: 'app-edit',
  standalone: true,
  imports: [
    SharedModule,
    DateInputComponent,
    TextInputComponent,
    TruncatePipe
  ],
  templateUrl: './edit.component.html',
  styleUrl: './edit.component.css'
})
export class EditComponent extends FormComponentBase implements OnInit, OnDestroy {
  @Input() title = '';
  @Input() hangHoa!: HangHoa;

  activeModal = inject(NgbActiveModal);
  dmService = inject(DmThitruongService);
  toastrService = inject(ToastrService);
  donViTinhService = inject(DmDonViTinhService);
  donViTinhSelectionService = inject(DonViTinhSelectionService);
  notificationService = inject(ModalNotificationService);

  private originalFormValues: any;
  private searchSubscription: Subscription | null = null;

  selectedDonViTinh: DonViTinhSelectDto | null = null;
  donViTinhList: DonViTinhSelectDto[] = [];
  isLoadingDonViTinh = false;
  iconFill = false;

  constructor(fb: FormBuilder) {
    super(fb);
  }

  ngOnInit(): void {
    this.buildForm();
    this.populateForm();
    
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

    // Add donViTinhId value change listener
    this.form.get('donViTinhId')?.valueChanges.subscribe(id => {
      if (id) this.loadSelectedDonViTinh(id);
      else this.selectedDonViTinh = null;
    });
  }

  override ngOnDestroy(): void {
    // Clean up subscription when component is destroyed
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
    super.ngOnDestroy();
  }

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
          this.toastrService.success(resp.message, resp.title);
          
          if (resp.data && resp.data.donViTinhId && this.selectedDonViTinh) {
            resp.data.donViTinhSelectDto = this.selectedDonViTinh;
          }
          
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
      // For date objects, compare their string representation
      if (key === 'ngayHieuLuc' || key === 'ngayHetHieuLuc') {
        if (this.originalFormValues[key] !== currentValues[key]) {
          return false;
        }
        continue;
      }
      
      // Don't skip objects, compare their values directly
      if (this.originalFormValues[key] !== currentValues[key]) {
        return false;
      }
    }
    return true;
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

  hasUnsavedChanges(): boolean {
    const currentValues = this.prepareFormData(['ngayHieuLuc', 'ngayHetHieuLuc']);
    
    return !this.isFormUnchanged(currentValues);
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
      dacTinh: [''],
      ngayHieuLuc: [null, Validators.required],
      ngayHetHieuLuc: [null, Validators.required],
      nhomHangHoaId: [null],
      donViTinhId: [null, Validators.required]
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
      dacTinh: this.hangHoa.dacTinh,
      ngayHieuLuc: ngayHieuLuc,
      ngayHetHieuLuc: ngayHetHieuLuc,
      nhomHangHoaId: this.hangHoa.nhomHangHoaId,
      donViTinhId: this.hangHoa.donViTinhId
    };

    this.form.patchValue(formValues);
    
    // Load the selected unit information if donViTinhId exists
    if (this.hangHoa.donViTinhId) {
      this.loadSelectedDonViTinh(this.hangHoa.donViTinhId);
    }

    this.originalFormValues = this.prepareFormData(['ngayHieuLuc', 'ngayHetHieuLuc']);
  }

  // Use the service to load the selected unit
  loadSelectedDonViTinh(id: string): void {
    this.donViTinhSelectionService.loadSelectedDonViTinh(id, this.donViTinhList)
      .subscribe(unit => {
        this.selectedDonViTinh = unit;
      });
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

  get isValidatingCode(): boolean {
    const control = this.form?.get('maMatHang');
    return control?.pending === true;
  }
}
