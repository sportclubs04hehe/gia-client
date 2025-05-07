import { Component, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal, NgbCalendar, NgbDateStruct, NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
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
import { Subject, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs';
import { SearchBarComponent } from '../../../../shared/components/search-bar/search-bar.component';
import { TextHighlightPipe } from '../../../../shared/pipes/text-highlight.pipe';

@Component({
  selector: 'app-them-moi',
  standalone: true,
  imports: [
    SharedModule,
    DateInputComponent,
    TextInputComponent,
    TruncatePipe,
    SearchBarComponent,
    TextHighlightPipe,
  ],
  templateUrl: './them-moi.component.html',
  styleUrl: './them-moi.component.css'
})
export class ThemMoiComponent extends FormComponentBase implements OnInit, OnDestroy {
  activeModal = inject(NgbActiveModal);
  calendar = inject(NgbCalendar);
  dmService = inject(DmThitruongService);
  donViTinhService = inject(DmDonViTinhService);
  modalService = inject(NgbModal);

  selectedDonViTinh: DonViTinhSelectDto | null = null;
  tempSelectedDonViTinh: DonViTinhSelectDto | null = null;
  donViTinhModalRef: NgbModalRef | null = null;

  @Input() title: string = '';
  @Input() onSave!: (dto: HangHoaCreateDto) => void;

  today!: NgbDateStruct;
  defaultNgayHetHieuLuc!: NgbDateStruct;
  donViTinhList: DonViTinhSelectDto[] = [];
  iconFill = false;

  // Add new properties for search functionality
  searchDonViTinhTerm = '';
  isLoadingDonViTinh = false;
  private searchTerms = new Subject<string>();

  constructor(fb: FormBuilder) {
    super(fb);
  }

  ngOnInit(): void {
    this.setDefaultDates();
    this.buildForm();
    this.loadDonViTinh();
    this.setupSearchStream();
    this.form.get('donViTinhId')?.valueChanges.subscribe(id => {
      if (id) {
        this.selectedDonViTinh = this.donViTinhList.find(d => d.id === id) || null;
      } else {
        this.selectedDonViTinh = null;
      }
    });
  }

  override ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
        validators: [Validators.required, Validators.maxLength(50)],
        asyncValidators: [uniqueItemCodeValidator(this.dmService, null)],
        updateOn: 'blur'
      }],
      tenMatHang: ['', [Validators.required, Validators.maxLength(200)]],
      ghiChu: [''],
      ngayHieuLuc: [this.today, Validators.required],
      ngayHetHieuLuc: [this.defaultNgayHetHieuLuc, Validators.required],
      nhomHangHoaId: [null],
      donViTinhId: [null]
    }, {
      validators: dateRangeValidator('ngayHieuLuc', 'ngayHetHieuLuc')
    });
  }
  
  loadDonViTinh(): void {
    this.isLoadingDonViTinh = true;
    const params = { pageIndex: 1, pageSize: 100 };
    
    this.donViTinhService.getAllSelect(params).subscribe({
      next: (result: PagedResult<DonViTinhSelectDto>) => {
        this.donViTinhList = result.data;
        this.isLoadingDonViTinh = false;
      },
      error: (error) => {
        console.error('Error loading units:', error);
        this.isLoadingDonViTinh = false;
      }
    });
  }

  setupSearchStream(): void {
    this.searchTerms.pipe(
      takeUntil(this.destroy$),
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(term => {
        this.isLoadingDonViTinh = true;
        const params = { 
          pageIndex: 1, 
          pageSize: 100,
          searchTerm: term
        };
        
        return this.donViTinhService.search(params);
      })
    ).subscribe({
      next: (result: PagedResult<any>) => {
        this.donViTinhList = result.data;
        this.isLoadingDonViTinh = false;
      },
      error: (error) => {
        console.error('Error searching units:', error);
        this.isLoadingDonViTinh = false;
      }
    });
  }

  onSearchDonViTinh(term: string): void {
    this.searchTerms.next(term);
  }

  clearDonViTinhSearch(): void {
    this.searchDonViTinhTerm = '';
    this.searchTerms.next('');
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

  openDonViTinhModal(content: any): void {
    this.iconFill = true;
    this.tempSelectedDonViTinh = this.selectedDonViTinh;
    this.donViTinhModalRef = this.modalService.open(content, { centered: true });
  }

  selectDonViTinh(donViTinh: DonViTinhSelectDto): void {
    this.tempSelectedDonViTinh = donViTinh;
  }

  confirmDonViTinhSelection(): void {
    if (this.tempSelectedDonViTinh) {
      this.form.patchValue({ donViTinhId: this.tempSelectedDonViTinh.id });
      this.selectedDonViTinh = this.tempSelectedDonViTinh;
      
      // Close only this specific modal instead of all modals
      if (this.donViTinhModalRef) {
        this.donViTinhModalRef.close();
      }
    }
  }
}
