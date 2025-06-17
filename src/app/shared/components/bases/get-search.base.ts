import { Directive, OnDestroy, OnInit, signal } from '@angular/core';
import { Subject, Subscription, debounceTime, distinctUntilChanged, filter, map } from 'rxjs';
import { PaginationParams } from '../../../features/danhmuc/models/helpers/pagination-params';
import { SearchParams } from '../../../features/danhmuc/models/helpers/search-params';
import { TableColumn } from '../../models/table-column';

@Directive()
export abstract class GetAndSearchBaseComponent<T, TService> implements OnInit, OnDestroy {

  items = signal<T[]>([]);
  selectedItem = signal<T | null>(null);
  isLoading = signal(false);
  hasNextPage = signal(false);
  currentPage = signal(1);
  totalItems = signal(0);
  searchTerm = signal('');
  
  // Configuration
  readonly defaultPageSize = 50;
  readonly searchPageSize = 15;
  
  // Table columns configuration
  columns: TableColumn<T>[] = [];

  // Search handling
  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  // Abstract properties and methods
  abstract get service(): TService; 
  abstract initColumns(): void;
  abstract getIdField(): string;

  // Service method signatures that must be implemented by the provided service
  protected abstract getAllFromService(params: PaginationParams): any;
  protected abstract searchFromService(params: SearchParams): any;

  protected get pageSize(): number {
    return this.searchTerm() ? this.searchPageSize : this.defaultPageSize;
  }

  ngOnInit(): void {
    this.initColumns();
    this.setupSearchDebounce();
    this.loadData();
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
    this.searchSubject.complete();
  }

  setupSearchDebounce(): void {
    this.searchSubscription = this.searchSubject
      .pipe(
        debounceTime(400),
        map(term => term?.trim() || ''),
        distinctUntilChanged(),
        filter(term => {
          // Bỏ qua nếu chuỗi tìm kiếm chỉ chứa khoảng trắng và trước đó cũng là chuỗi rỗng
          const wasEmpty = !this.searchTerm();
          const isNowEmpty = !term;
          return !(wasEmpty && isNowEmpty);
        })
      )
      .subscribe(term => {
        this.searchTerm.set(term);
        this.currentPage.set(1);
        this.items.set([]);
        this.loadData();
      });
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

    this.getAllFromService(params).subscribe({
      next: (response: any) => {
        this.items.set(response.data);
        this.totalItems.set(response.pagination.totalItems);
        this.hasNextPage.set(response.pagination.hasNextPage);
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading data:', error);
        this.isLoading.set(false);
      }
    });
  }

  performSearch(): void {
    // Kiểm tra nếu searchTerm chỉ chứa khoảng trắng thì không gọi API
    if (!this.searchTerm() || this.searchTerm().trim() === '') {
      this.isLoading.set(false);
      return;
    }

    const params: SearchParams = {
      searchTerm: this.searchTerm().trim(),
      pageIndex: this.currentPage(),
      pageSize: this.searchPageSize 
    };

    this.searchFromService(params).subscribe({
      next: (response: any) => {
        this.items.set(response.data);
        this.totalItems.set(response.pagination.totalItems);
        this.hasNextPage.set(response.pagination.hasNextPage);
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Error searching data:', error);
        this.isLoading.set(false);
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
      pageSize: this.defaultPageSize  
    };

    this.getAllFromService(params).subscribe({
      next: (response: any) => {
        this.items.update(currentItems => [...currentItems, ...response.data]);
        this.hasNextPage.set(response.pagination.hasNextPage);
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading more data:', error);
        this.isLoading.set(false);
      }
    });
  }

  loadMoreSearchResults(): void {
    if (!this.searchTerm() || this.searchTerm().trim() === '') {
      this.isLoading.set(false);
      return;
    }

    const params: SearchParams = {
      searchTerm: this.searchTerm().trim(),
      pageIndex: this.currentPage(),
      pageSize: this.searchPageSize  
    };

    this.searchFromService(params).subscribe({
      next: (response: any) => {
        this.items.update(currentItems => [...currentItems, ...response.data]);
        this.hasNextPage.set(response.pagination.hasNextPage);
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading more search results:', error);
        this.isLoading.set(false);
      }
    });
  }

  clearSearch(): void {
    if (this.searchTerm()) {
      this.searchTerm.set('');
      this.currentPage.set(1);
      this.items.set([]);
      this.loadAllData();
    }
  }
  
  onSearchInputChange(term: string): void {
    this.searchSubject.next(term);
  }

  onSelectItem(item: T): void {
    this.selectedItem.set(item);
  }

  editItem(item: T): void {
    // Được triển khai bởi component con
  }
}