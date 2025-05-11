import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { DonViTinhSelectDto } from '../../models/dm_donvitinh/don-vi-tinh-select.dto';
import { PagedResult } from '../../models/paged-result';
import { SelectionModalService } from '../../../../shared/components/selection-modal/selection-modal.service';
import { FormGroup } from '@angular/forms';
import { DmDonViTinhService } from '../api/dm-don-vi-tinh.service';

@Injectable({
  providedIn: 'root'
})
export class DonViTinhSelectionService {
  private donViTinhSearchTerms = new BehaviorSubject<string>('');
  private modalRef: any;
  public donViTinhList: DonViTinhSelectDto[] = [];
  public isLoading = false;

  constructor(
    private donViTinhService: DmDonViTinhService,
    private selectionModalService: SelectionModalService
  ) {}

  /**
   * Load unit information by ID, first checking the cached list
   */
  loadSelectedDonViTinh(id: string, donViTinhList: DonViTinhSelectDto[]): Observable<DonViTinhSelectDto | null> {
    // Create a new subject for this operation's result
    const resultSubject = new BehaviorSubject<DonViTinhSelectDto | null>(null);
    
    // First check the cached list
    const cachedUnit = donViTinhList.find(d => d.id === id);
    if (cachedUnit) {
      resultSubject.next(cachedUnit);
      resultSubject.complete();
      return resultSubject;
    }

    // If not found in cache, load from API
    if (id) {
      this.donViTinhService.getById(id).subscribe({
        next: (result) => {
          if (result && typeof result.id === 'string' && 
              typeof result.ma === 'string' && 
              typeof result.ten === 'string') {
            const unit = {
              id: result.id,
              ma: result.ma,
              ten: result.ten
            };
            resultSubject.next(unit);
          } else {
            console.error('Invalid result data:', result);
            resultSubject.next(null);
          }
          resultSubject.complete();
        },
        error: (error) => {
          console.error('Error loading selected unit:', error);
          resultSubject.next(null);
          resultSubject.complete();
        }
      });
    } else {
      resultSubject.next(null);
      resultSubject.complete();
    }

    return resultSubject;
  }

  /**
   * Open unit selection modal
   */
  openDonViTinhModal(form: FormGroup, onUnitSelected: (unit: DonViTinhSelectDto) => void): void {
    this.isLoading = true;

    // Load initial list of units
    this.donViTinhService.getAllSelect({ pageIndex: 1, pageSize: 100 }).subscribe({
      next: (result: PagedResult<DonViTinhSelectDto>) => {
        this.donViTinhList = result.data;
        this.isLoading = false;

        // Configure modal options
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
          selectedId: form.get('donViTinhId')?.value || null,
          searchFn: (term: string) => this.searchDonViTinh(term),
          clearSearchFn: () => this.clearDonViTinhSearch()
        };

        // Open the modal and store reference
        this.modalRef = this.selectionModalService.openWithRef(options);

        // Handle modal result
        this.modalRef.result.then((result: DonViTinhSelectDto) => {
          if (result) {
            onUnitSelected(result);
          }
        }).catch(() => {
          // Modal dismissed
        });
      },
      error: (error) => {
        console.error('Error loading units:', error);
        this.isLoading = false;
      }
    });
  }

  /**
   * Setup search functionality for DonViTinh
   */
  setupDonViTinhSearchStream(): Observable<PagedResult<DonViTinhSelectDto>> {
    return this.donViTinhSearchTerms.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      tap(() => {
        // Set service loading state
        this.isLoading = true;
        
        // Only try to set component loading state if the modalRef and componentInstance exist
        if (this.modalRef && this.modalRef.componentInstance) {
          this.modalRef.componentInstance.isLoading = true;
        }
      }),
      switchMap(term => {
        const params = {
          pageIndex: 1,
          pageSize: 100,
          searchTerm: term
        };
  
        return (term
          ? this.donViTinhService.search(params)
          : this.donViTinhService.getAllSelect(params)) as Observable<PagedResult<DonViTinhSelectDto>>;
      }),
      tap(result => {
        this.donViTinhList = result.data;
        this.isLoading = false;
  
        // Only update component properties if modalRef and componentInstance exist
        if (this.modalRef && this.modalRef.componentInstance) {
          const component = this.modalRef.componentInstance;
          component.items = this.donViTinhList;
          component.isLoading = false;
          component.searchTerm = this.donViTinhSearchTerms.getValue();
        }
      })
    );
  }

  /**
   * Search units by term
   */
  searchDonViTinh(term: string): void {
    this.donViTinhSearchTerms.next(term);
  }

  /**
   * Clear search term
   */
  clearDonViTinhSearch(): void {
    this.donViTinhSearchTerms.next('');
  }
}
