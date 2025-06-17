import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableDataComponent } from '../../../../shared/components/table/table-data/table-data.component';
import { ActiveButtonComponent } from '../../../../shared/components/active-button/active-button.component';
import { ThuThapGiaThiTruongService } from '../../services/api/thu-thap-gia-thi-truong.service';
import { ThuThapGiaThiTruongDto } from '../../models/thu-thap-gia-thi-truong/ThuThapGiaThiTruongDto';
import { PaginationParams } from '../../../danhmuc/models/helpers/pagination-params';
import { SearchParams } from '../../../danhmuc/models/helpers/search-params';
import { Observable } from 'rxjs';
import { PagedResult } from '../../../danhmuc/models/helpers/paged-result';
import { GetAndSearchBaseComponent } from '../../../../shared/components/bases/get-search.base';
import { SearchInputComponent } from '../../../../shared/components/search/search-input/search-input.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ThemmoiTt29Component } from '../themmoi-tt29/themmoi-tt29.component';

@Component({
  selector: 'app-main-ttgtt',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableDataComponent,
    ActiveButtonComponent,
    SearchInputComponent,
  ],
  templateUrl: './main-ttgtt.component.html',
  styleUrl: './main-ttgtt.component.css'
})
export class MainTtgttComponent extends GetAndSearchBaseComponent<ThuThapGiaThiTruongDto, ThuThapGiaThiTruongService> {
  private thuThapGiaService = inject(ThuThapGiaThiTruongService);
  private modalService = inject(NgbModal);
  
  get service(): ThuThapGiaThiTruongService {
    return this.thuThapGiaService;
  }
  
  protected getAllFromService(params: PaginationParams): Observable<PagedResult<ThuThapGiaThiTruongDto>> {
    return this.thuThapGiaService.getAll(params);
  }
  
  protected searchFromService(params: SearchParams): Observable<PagedResult<ThuThapGiaThiTruongDto>> {
    return this.thuThapGiaService.search(params);
  }

  getIdField(): string {
    return 'id';
  }

  initColumns(): void {
    this.columns = [
      {
        header: 'Tên hàng hóa',
        field: 'tenHangHoa'
      },
      {
        header: 'Loại giá',
        field: 'tenLoaiGia',
        width: '120px'
      },
      {
        header: 'Ngày thu thập',
        field: 'ngayThuThap',
        formatter: (item) => new Date(item.ngayThuThap).toLocaleDateString('vi-VN')
      }
    ];
  }
  
  override editItem(item: ThuThapGiaThiTruongDto): void {
    console.log('Edit item:', item);
    // Logic to open edit form or navigate to edit page
  }

  handleButtonAction(action: string): void {
    switch (action) {
      case 'add':
        this.openAddModal();
        break;
      case 'edit':
        if (this.selectedItem()) {
          this.editItem(this.selectedItem()!);
        }
        break;
      // Add additional cases for other actions if needed
    }
  }

  openAddModal(): void {
    const modalRef = this.modalService.open(ThemmoiTt29Component, {
      fullscreen: true,
      scrollable: true,
      backdrop: 'static',
      keyboard: false
    });
    
    // Handle the result when modal is closed
    modalRef.result.then(
      (result) => {
        if (result === 'Đã lưu') {
          // Refresh data after saving
          this.loadData();
        }
      },
      (reason) => {
        console.log('Modal dismissed:', reason);
      }
    );
  }
}
