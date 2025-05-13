import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { PagedResult } from '../../models/paged-result';
import { FormGroup } from '@angular/forms';
import { DmNhomHangHoaService } from '../api/dm-nhom-hang-hoa.service';
import { NhomHangHoaDto } from '../../models/dm_nhomhanghoathitruong/NhomHangHoaDto';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { NhomHangHoaModalComponent } from '../../dm-hang-hoa-thi-truong/them-moi/nhom-hang-hoa-modal/nhom-hang-hoa-modal.component';

@Injectable({
  providedIn: 'root'
})
export class NhomHangHoaSelectionService {
  private nhomHangHoaCache: { [id: string]: NhomHangHoaDto } = {};
  private nhomHangHoaSearchTerms = new BehaviorSubject<string>('');
  private modalRef: any;
  public nhomHangHoaList: NhomHangHoaDto[] = [];
  public isLoading = false;

  constructor(
    private nhomHangHoaService: DmNhomHangHoaService,
    private modalService: NgbModal
  ) {}

  /**
   * Load nhóm hàng hóa by ID, first checking the cache
   */
  loadSelectedNhomHangHoa(id: string): Observable<NhomHangHoaDto | null> {
  const resultSubject = new BehaviorSubject<NhomHangHoaDto | null>(null);
  
  // Check cache first - kiểm tra id là string và tồn tại trong cache
  if (id && this.nhomHangHoaCache[id]) {
    resultSubject.next(this.nhomHangHoaCache[id]);
    resultSubject.complete();
    return resultSubject;
  }

  // If not found in cache, load from API
  if (id) {
    this.nhomHangHoaService.getById(id).subscribe({
      next: (result) => {
        if (result && result.id) {
          // Add to cache
          this.nhomHangHoaCache[result.id] = result;
          resultSubject.next(result);
        } else {
          console.error('Invalid nhóm hàng hóa data:', result);
          resultSubject.next(null);
        }
        resultSubject.complete();
      },
      error: (error) => {
        console.error('Error loading nhóm hàng hóa:', error);
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
   * Mở modal chọn nhóm hàng hóa với dạng tree view
   * Uses cached data from the service
   */
  openNhomHangHoaModal(form: FormGroup, onGroupSelected: (group: NhomHangHoaDto) => void): NgbModalRef {
    const modalRef = this.modalService.open(NhomHangHoaModalComponent, {
      size: 'lg',
      backdrop: 'static',
      keyboard: false,
      centered: true
    });
    
    // Pass the selected ID to the modal
    const nhomHangHoaId = form.get('nhomHangHoaId')?.value;
    modalRef.componentInstance.selectedId = nhomHangHoaId;
    
    // Handle result when modal is closed
    modalRef.result.then((result: NhomHangHoaDto) => {
      if (result) {
        // Update the cache
        this.nhomHangHoaCache[result.id] = result;
        
        // Call the callback with the selected group
        onGroupSelected(result);
      }
    }).catch(() => {
      // Modal was dismissed, no action needed
    });
    
    return modalRef;
  }

  /**
   * Setup search functionality for NhomHangHoa
   */
  setupNhomHangHoaSearchStream(): Observable<PagedResult<NhomHangHoaDto>> {
    return this.nhomHangHoaSearchTerms.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      tap(() => {
        this.isLoading = true;
        
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
          ? this.nhomHangHoaService.search(params)
          : this.nhomHangHoaService.getAll(params)) as Observable<PagedResult<NhomHangHoaDto>>;
      }),
      tap(result => {
        this.nhomHangHoaList = result.data;
        this.isLoading = false;
  
        if (this.modalRef && this.modalRef.componentInstance) {
          const component = this.modalRef.componentInstance;
          component.items = this.nhomHangHoaList;
          component.isLoading = false;
          component.searchTerm = this.nhomHangHoaSearchTerms.getValue();
        }
      })
    );
  }

  /**
   * Search nhóm hàng hóa by term
   */
  searchNhomHangHoa(term: string): void {
    this.nhomHangHoaSearchTerms.next(term);
  }

  /**
   * Clear search term
   */
  clearNhomHangHoaSearch(): void {
    this.nhomHangHoaSearchTerms.next('');
  }
}
