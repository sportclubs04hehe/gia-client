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
import { DmDonViTinhService } from '../../services/dm-don-vi-tinh.service';
import { DonViTinhSelectDto } from '../../models/dm_donvitinh/don-vi-tinh-select.dto';
import { PagedResult } from '../../models/paged-result';
import { TruncatePipe } from '../../../../shared/pipes/truncate.pipe';
import { SelectionModalService } from '../../../../shared/components/selection-modal/selection-modal.service';
import { ModalNotificationService } from '../../../../shared/components/notifications/modal-notification/modal-notification.service';
import { Subject } from 'rxjs/internal/Subject';
import { debounceTime, distinctUntilChanged, tap, switchMap, Observable } from 'rxjs';

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
  donViTinhService = inject(DmDonViTinhService);
  selectionModalService = inject(SelectionModalService);
  notificationService = inject(ModalNotificationService);

  selectedDonViTinh: DonViTinhSelectDto | null = null;

  @Input() title: string = '';
  @Input() onSave!: (dto: HangHoaCreateDto) => void;

  today!: NgbDateStruct;
  defaultNgayHetHieuLuc!: NgbDateStruct;
  donViTinhList: DonViTinhSelectDto[] = [];
  iconFill = false;

  // Variable for search functionality
  isLoadingDonViTinh = false;

  private modalRef: any; // Store the modal reference
  private donViTinhSearchTerms = new Subject<string>();

  // Add a property to track initial form values
  initialFormValue: any;

  constructor(fb: FormBuilder) {
    super(fb);
  }

  ngOnInit(): void {
    this.setDefaultDates();
    this.buildForm();

    // Store initial form value to track changes
    this.initialFormValue = this.form.value;

    this.form.get('donViTinhId')?.valueChanges.subscribe(id => {
      if (id) this.loadSelectedDonViTinh(id);
      else this.selectedDonViTinh = null;
    });

    // Setup search stream for DonViTinh
    this.setupDonViTinhSearchStream();
  }

  // Check if form has unsaved changes
  hasUnsavedChanges(): boolean {
    // Convert current form value to JSON string to make deep comparison
    const currentValue = JSON.stringify(this.form.value);
    const initialValue = JSON.stringify(this.initialFormValue);

    // Return true if values are different and form is not pristine
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
      donViTinhId: [null, Validators.required]  // Added required validator here
    }, {
      validators: dateRangeValidator('ngayHieuLuc', 'ngayHetHieuLuc')
    });
  }

  loadSelectedDonViTinh(id: string): void {
    this.selectedDonViTinh = this.donViTinhList.find(d => d.id === id) || null;

    if (!this.selectedDonViTinh && id) {
      this.donViTinhService.getById(id).subscribe({
        next: (result) => {
          if (result && typeof
            result.id === 'string'
            && typeof result.ma === 'string'
            && typeof result.ten === 'string') {
            this.selectedDonViTinh = {
              id: result.id,
              ma: result.ma,
              ten: result.ten
            };
          } else {
            console.error('Invalid result data:', result);
          }
        },
        error: (error) => {
          console.error('Error loading selected unit:', error);
        }
      });
    }
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

  openDonViTinhModal(): void {
    this.iconFill = true;
    this.isLoadingDonViTinh = true;

    // First load the initial list of units
    this.donViTinhService.getAllSelect({ pageIndex: 1, pageSize: 100 }).subscribe({
      next: (result: PagedResult<DonViTinhSelectDto>) => {
        this.donViTinhList = result.data;
        this.isLoadingDonViTinh = false;

        // Then open the modal with the loaded data
        const options = {
          title: 'Chọn đơn vị tính',
          items: this.donViTinhList,
          columns: [
            { field: 'ma', header: 'Mã', width: '30%' },
            { field: 'ten', header: 'Tên đơn vị tính', width: '70%', truncateLength: 30 }
          ],
          idField: 'id',
          searchPlaceholder: 'Tìm kiếm đơn vị tính...',
          noDataMessage: 'Không có dữ liệu',
          loadingMessage: 'Đang tải...',
          selectedId: this.form.get('donViTinhId')?.value || null,
          searchFn: (term: string) => this.searchDonViTinh(term),
          clearSearchFn: () => this.clearDonViTinhSearch()
        };

        // Get the modal reference when opening
        this.modalRef = this.selectionModalService.openWithRef(options);

        this.modalRef.result.then((result: DonViTinhSelectDto) => {
          this.iconFill = false;
          if (result) {
            this.selectedDonViTinh = result;
            this.form.patchValue({ donViTinhId: result.id });
          }
        }).catch(() => {
          this.iconFill = false;
        });
      },
      error: (error) => {
        console.error('Error loading units:', error);
        this.isLoadingDonViTinh = false;
        this.iconFill = false;
      }
    });
  }

  // Replace your existing search methods with these:
  searchDonViTinh(term: string): void {
    this.donViTinhSearchTerms.next(term);
  }

  clearDonViTinhSearch(): void {
    this.donViTinhSearchTerms.next('');
  }

  // Add this method
  isControlInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }

  setupDonViTinhSearchStream(): void {
    this.donViTinhSearchTerms.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      tap(() => {
        if (this.modalRef) {
          const component = this.modalRef.componentInstance;
          component.isLoading = true;
        }
      }),
      switchMap(term => {
        const params = {
          pageIndex: 1,
          pageSize: 100,
          searchTerm: term
        };

        // Ensure consistent return types with explicit cast
        return (term
          ? this.donViTinhService.search(params)
          : this.donViTinhService.getAllSelect(params)) as Observable<PagedResult<DonViTinhSelectDto>>;
      })
    ).subscribe({
      next: (result: PagedResult<DonViTinhSelectDto>) => {
        this.donViTinhList = result.data;
        this.isLoadingDonViTinh = false;

        if (this.modalRef) {
          const component = this.modalRef.componentInstance;
          component.items = this.donViTinhList;
          component.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Error searching/loading units:', error);
        this.isLoadingDonViTinh = false;

        if (this.modalRef) {
          const component = this.modalRef.componentInstance;
          component.isLoading = false;
        }
      }
    });
  }


}
