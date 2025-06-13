import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableDataComponent } from '../../../../shared/components/table/table-data/table-data.component';
import { ThuThapGiaThiTruongService } from '../../services/api/thu-thap-gia-thi-truong.service';
import { TableColumn } from '../../../../shared/models/table-column';
import { ThuThapGiaThiTruongDto } from '../../models/thu-thap-gia-thi-truong/ThuThapGiaThiTruongDto';
import { SearchParams } from '../../../danhmuc/models/helpers/search-params';
import { PaginationParams } from '../../../danhmuc/models/helpers/pagination-params ';
import { ActiveButtonComponent } from '../../../../shared/components/active-button/active-button.component';
import { SearchBarComponent } from '../../../../shared/components/search-bar/search-bar.component';
import { Subject, debounceTime, distinctUntilChanged, switchMap, tap, filter } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-main-ttgtt',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableDataComponent,
    ActiveButtonComponent,
    SearchBarComponent,
  ],
  templateUrl: './main-ttgtt.component.html',
  styleUrl: './main-ttgtt.component.css'
})
export class MainTtgttComponent implements OnInit {
  @ViewChild(SearchBarComponent) searchBarComponent!: SearchBarComponent;
  
  // Services
  private thuThapGiaService = inject(ThuThapGiaThiTruongService);
  private toastr = inject(ToastrService);
  private searchTerms = new Subject<string>();

  // Signal state
  items = signal<ThuThapGiaThiTruongDto[]>([]);
  selectedItem = signal<ThuThapGiaThiTruongDto | null>(null);
  isLoading = signal(false);
  hasNextPage = signal(false);
  searchTerm = signal('');
  currentPage = signal(1);
  totalItems = signal(0);
  readonly getAllPageSize = 50;
  readonly searchPageSize = 15;

  // Columns configuration
  columns: TableColumn<ThuThapGiaThiTruongDto>[] = [];

  ngOnInit(): void {
    this.initColumns();
    this.setupSearchStream();
    this.loadData();
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

  setupSearchStream(): void {
    this.searchTerms.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      filter((term): boolean => {
        if (!term) return false;
        return term.trim().length > 0;
      }),
      tap(term => {
        this.isLoading.set(true);
        this.currentPage.set(1);
        this.items.set([]);
        this.hasNextPage.set(true);
      }),
      switchMap(term => {
        this.searchTerm.set(term);
        const params = {
          pageIndex: 1,
          pageSize: this.searchPageSize,
          searchTerm: term
        };
        return this.thuThapGiaService.search(params);
      })
    ).subscribe({
      next: response => {
        this.items.set(response.data);
        this.totalItems.set(response.pagination.totalItems);
        this.hasNextPage.set(response.pagination.hasNextPage);
        this.currentPage.set(2);
        this.isLoading.set(false);
        
        // Focus search input after loading
        if (this.searchBarComponent) {
          setTimeout(() => this.searchBarComponent.searchInput.nativeElement.focus(), 0);
        }
      },
      error: error => {
        console.error('Error searching data:', error);
        this.isLoading.set(false);
        this.toastr.error('Không thể tìm kiếm dữ liệu', 'Lỗi');
      }
    });
  }

  onSearchChange(term: string): void {
    this.searchTerms.next(term);
  }

  clearSearch(): void {
    // Ngăn chặn tìm kiếm đang diễn ra
    this.searchTerms.next(''); // Reset searchTerms để hủy các tìm kiếm đang chờ
    
    // Reset searchBarComponent ngay lập tức
    if (this.searchBarComponent) {
      this.searchBarComponent.searchModel = '';
    }

    // Đặt searchTerm về rỗng ngay lập tức để tắt highlight
    this.searchTerm.set('');
    
    // Bắt đầu loading và reset pagination
    this.isLoading.set(true);
    this.currentPage.set(1);
    this.items.set([]);
    
    // Load fresh data
    const params: PaginationParams = {
      pageIndex: 1,
      pageSize: this.getAllPageSize
    };

    // Sử dụng trực tiếp getAll thay vì qua searchStream
    this.thuThapGiaService.getAll(params).subscribe({
      next: (response) => {
        this.items.set(response.data);
        this.totalItems.set(response.pagination.totalItems);
        this.hasNextPage.set(response.pagination.hasNextPage);
        this.currentPage.set(2);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading data:', error);
        this.isLoading.set(false);
        this.toastr.error('Không thể tải dữ liệu', 'Lỗi');
      }
    });
  }

  loadData(): void {
    // Nếu đã setup search stream, không cần loadData nữa
    if (this.searchTerm()) return;
    
    this.isLoading.set(true);
    const params: PaginationParams = {
      pageIndex: this.currentPage(),
      pageSize: this.getAllPageSize // Use getAllPageSize
    };

    this.thuThapGiaService.getAll(params).subscribe({
      next: (response) => {
        this.items.set(response.data);
        this.totalItems.set(response.pagination.totalItems);
        this.hasNextPage.set(response.pagination.hasNextPage);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading data:', error);
        this.isLoading.set(false);
        this.toastr.error('Không thể tải dữ liệu', 'Lỗi');
      }
    });
  }

  onLoadMore(): void {
    if (this.hasNextPage() && !this.isLoading()) {
      this.currentPage.update(page => page + 1);
      this.loadMoreData();
    }
  }

  loadMoreData(): void {
    this.isLoading.set(true);

    const params: SearchParams = {
      searchTerm: this.searchTerm(),
      pageIndex: this.currentPage(),
      pageSize: this.searchTerm() ? this.searchPageSize : this.getAllPageSize // Use appropriate page size
    };

    const method = this.searchTerm()
      ? this.thuThapGiaService.search(params)
      : this.thuThapGiaService.getAll(params);

    method.subscribe({
      next: (response) => {
        this.items.update(currentItems => [...currentItems, ...response.data]);
        this.hasNextPage.set(response.pagination.hasNextPage);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading more data:', error);
        this.isLoading.set(false);
        this.toastr.error('Không thể tải thêm dữ liệu', 'Lỗi');
      }
    });
  }

  onSelectItem(item: ThuThapGiaThiTruongDto): void {
    this.selectedItem.set(item);
  }

  editItem(item: ThuThapGiaThiTruongDto): void {
    console.log('Edit item:', item);
    // Logic to open edit form or navigate to edit page
  }
}
