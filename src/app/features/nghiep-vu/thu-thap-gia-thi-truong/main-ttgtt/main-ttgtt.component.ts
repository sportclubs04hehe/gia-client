import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableDataComponent } from '../../../../shared/components/table/table-data/table-data.component';
import { ThuThapGiaThiTruongService } from '../../services/api/thu-thap-gia-thi-truong.service';
import { TableColumn } from '../../../../shared/models/table-column';
import { ThuThapGiaThiTruongDto } from '../../models/thu-thap-gia-thi-truong/ThuThapGiaThiTruongDto';
import { PaginationParams } from '../../../danhmuc/models/helpers/pagination-params ';
import { ActiveButtonComponent } from '../../../../shared/components/active-button/active-button.component';
import { ToastrService } from 'ngx-toastr';
import { SearchParams } from '../../../danhmuc/models/helpers/search-params';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-main-ttgtt',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableDataComponent,
    ActiveButtonComponent,
  ],
  templateUrl: './main-ttgtt.component.html',
  styleUrl: './main-ttgtt.component.css'
})
export class MainTtgttComponent implements OnInit, OnDestroy {
  // Services
  private thuThapGiaService = inject(ThuThapGiaThiTruongService);
  private toastr = inject(ToastrService);

  // Signal state
  items = signal<ThuThapGiaThiTruongDto[]>([]);
  selectedItem = signal<ThuThapGiaThiTruongDto | null>(null);
  isLoading = signal(false);
  hasNextPage = signal(false);
  currentPage = signal(1);
  totalItems = signal(0);
  searchTerm = signal('');
  readonly pageSize = 50;

  // Search debounce
  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  // Columns configuration
  columns: TableColumn<ThuThapGiaThiTruongDto>[] = [];

  ngOnInit(): void {
    this.initColumns();
    this.setupSearchDebounce();
    this.loadData();
  }

  ngOnDestroy(): void {
    // Clean up subscriptions to prevent memory leaks
    this.searchSubscription?.unsubscribe();
    this.searchSubject.complete();
  }

  setupSearchDebounce(): void {
    // Setup debouncing for search with 400ms delay
    this.searchSubscription = this.searchSubject
      .pipe(
        debounceTime(400),  // Wait for 400ms pause in events
        distinctUntilChanged()  // Only emit when the value has changed
      )
      .subscribe(term => {
        this.searchTerm.set(term);
        this.currentPage.set(1); // Reset to first page on search
        this.items.set([]); // Clear current items
        this.loadData(); // Load data with search term
      });
  }

  onSearchInputChange(term: string): void {
    // Push the search term to the subject
    this.searchSubject.next(term);
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

  loadData(): void {
    this.isLoading.set(true);
    
    if (this.searchTerm()) {
      this.performSearch();
    } else {
      this.loadAllData();
    }
  }

  loadAllData(): void {
    const params: PaginationParams = {
      pageIndex: this.currentPage(),
      pageSize: this.pageSize
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

  performSearch(): void {
    const params: SearchParams = {
      searchTerm: this.searchTerm(),
      pageIndex: this.currentPage(),
      pageSize: this.pageSize
    };

    this.thuThapGiaService.search(params).subscribe({
      next: (response) => {
        this.items.set(response.data);
        this.totalItems.set(response.pagination.totalItems);
        this.hasNextPage.set(response.pagination.hasNextPage);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error searching data:', error);
        this.isLoading.set(false);
        this.toastr.error('Không thể tìm kiếm dữ liệu', 'Lỗi');
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

    if (this.searchTerm()) {
      this.loadMoreSearchResults();
    } else {
      this.loadMoreAllData();
    }
  }

  loadMoreAllData(): void {
    const params: PaginationParams = {
      pageIndex: this.currentPage(),
      pageSize: this.pageSize
    };

    this.thuThapGiaService.getAll(params).subscribe({
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

  loadMoreSearchResults(): void {
    const params: SearchParams = {
      searchTerm: this.searchTerm(),
      pageIndex: this.currentPage(),
      pageSize: this.pageSize
    };

    this.thuThapGiaService.search(params).subscribe({
      next: (response) => {
        this.items.update(currentItems => [...currentItems, ...response.data]);
        this.hasNextPage.set(response.pagination.hasNextPage);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading more search results:', error);
        this.isLoading.set(false);
        this.toastr.error('Không thể tải thêm kết quả tìm kiếm', 'Lỗi');
      }
    });
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.currentPage.set(1);
    this.loadData();
  }

  onSelectItem(item: ThuThapGiaThiTruongDto): void {
    this.selectedItem.set(item);
  }

  editItem(item: ThuThapGiaThiTruongDto): void {
    console.log('Edit item:', item);
    // Logic to open edit form or navigate to edit page
  }
}
