import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActiveButtonComponent } from '../../../shared/components/active-button/active-button.component';
import { SearchBarComponent } from '../../../shared/components/search-bar/search-bar.component';
import { DmHangHoaThiTruongService } from '../services/api/dm-hang-hoa-thi-truong.service';
import { HHThiTruongDto } from '../models/dm-hh-thitruong/HHThiTruongDto';
import { ToastrService } from 'ngx-toastr';
import { HHThiTruongTreeNodeDto } from '../models/dm-hh-thitruong/HHThiTruongTreeNodeDto';
import { SpinnerService } from '../../../shared/services/spinner.service';
import { NgxSpinnerModule } from 'ngx-spinner';
import { InfiniteScrollDirective } from 'ngx-infinite-scroll';

@Component({
  selector: 'app-dm-hang-hoa-thi-truongs',
  standalone: true,
  imports: [
    CommonModule,
    ActiveButtonComponent,
    SearchBarComponent,
    NgxSpinnerModule,
    InfiniteScrollDirective  // Thêm module vào imports
  ],
  templateUrl: './dm-hang-hoa-thi-truongs.component.html',
  styleUrl: './dm-hang-hoa-thi-truongs.component.css'
})
export class DmHangHoaThiTruongsComponent implements OnInit {
  private toastr = inject(ToastrService);
  private spinnerService = inject(SpinnerService);

  // Các thuộc tính hiện tại...
  parentCategories: HHThiTruongDto[] = [];
  expandedRows = new Map<string, boolean>();
  nodeChildrenMap = new Map<string, HHThiTruongTreeNodeDto[]>();
  nodeLoadingMap = new Map<string, boolean>();
  selectedRowId: string | null = null;
  
  // Thêm Map để lưu trữ thông tin phân trang cho mỗi node
  nodePaginationMap = new Map<string, {
    currentPage: number;
    totalPages: number;
    hasNextPage: boolean;
    isLoadingMore: boolean;
  }>();
  
  constructor(private dmHangHoaThiTruongService: DmHangHoaThiTruongService) {}
  
  ngOnInit(): void {
    this.loadParentCategories();
  }
  
  // Tải danh sách mặt hàng cha (cấp cao nhất)
  loadParentCategories(): void {
    // Hiển thị spinner khi bắt đầu tải dữ liệu
    this.spinnerService.showTableSpinner();
    
    this.dmHangHoaThiTruongService.getAllParentCategories().subscribe({
      next: (data) => {
        this.parentCategories = data;
        // Ẩn spinner khi tải xong
        this.spinnerService.hideTableSpinner();
      },
      error: (error) => {
        console.error('Lỗi khi tải danh sách mặt hàng cha:', error);
        this.toastr.error('Không thể tải danh sách mặt hàng', 'Lỗi');
        // Ẩn spinner khi có lỗi
        this.spinnerService.hideTableSpinner();
      }
    });
  }

  // Kiểm tra node có đang mở rộng không
  isNodeExpanded(nodeId: string): boolean {
    return this.expandedRows.get(nodeId) === true;
  }

  // Kiểm tra đang tải con cho node không
  isLoadingChildren(nodeId: string): boolean {
    return this.nodeLoadingMap.get(nodeId) === true;
  }

  // Lấy danh sách con của node
  getNodeChildren(nodeId: string): HHThiTruongTreeNodeDto[] {
    return this.nodeChildrenMap.get(nodeId) || [];
  }

  // Kiểm tra node có con không hoặc có thể có con không
  hasChildren(item: HHThiTruongTreeNodeDto | HHThiTruongDto): boolean {
    // Nếu là nhóm mặt hàng (loại 0) thì có thể có con
    return item.loaiMatHang === 0 || 
           // Hoặc đã có dữ liệu con được tải
           (this.nodeChildrenMap.has(item.id) && this.getNodeChildren(item.id).length > 0);
  }

  // Mở rộng/thu gọn một node
  toggleNode(event: Event, item: HHThiTruongTreeNodeDto | HHThiTruongDto): void {
    // Ngăn chặn sự kiện lan đến hàng
    event.stopPropagation();
    
    const nodeId = item.id;
    const isCurrentlyExpanded = this.isNodeExpanded(nodeId);
    
    // Đảo ngược trạng thái mở rộng
    this.expandedRows.set(nodeId, !isCurrentlyExpanded);
    
    // Nếu đang mở rộng và chưa tải dữ liệu con, thì tải dữ liệu
    if (!isCurrentlyExpanded && !this.nodeChildrenMap.has(nodeId)) {
      // Khởi tạo thông tin phân trang
      this.nodePaginationMap.set(nodeId, {
        currentPage: 1,
        totalPages: 1,
        hasNextPage: true,
        isLoadingMore: false
      });
      
      this.loadChildrenForNode(nodeId, 1);
    }
  }
  
  // Cập nhật phương thức để hỗ trợ phân trang
  loadChildrenForNode(nodeId: string, pageIndex: number = 1): void {
    // Lấy thông tin phân trang
    const pagination = this.nodePaginationMap.get(nodeId);
    
    // Nếu đang tải thêm, đặt cờ
    if (pageIndex > 1) {
      if (pagination) {
        pagination.isLoadingMore = true;
        this.nodePaginationMap.set(nodeId, pagination);
      }
    } else {
      // Đánh dấu đang tải (chỉ khi tải trang đầu tiên)
      this.nodeLoadingMap.set(nodeId, true);
    }
    
    // Gọi API với phân trang
    this.dmHangHoaThiTruongService.getChildrenByParent(nodeId, pageIndex, 100).subscribe({
      next: (result) => {
        // Xử lý dữ liệu trả về
        let children: HHThiTruongTreeNodeDto[] = [];
        let paginationInfo = null;
        
        if (Array.isArray(result)) {
          // Trường hợp API trả về mảng trực tiếp
          children = result;
          
          // Kiểm tra pagination header nếu có (xử lý ở interceptor)
        } else if (result && 'data' in result) {
          // Trường hợp API trả về đối tượng PagedResult
          children = result.data || [];
          paginationInfo = result.pagination;
        }
        
        // Xử lý dữ liệu dựa trên pageIndex
        if (pageIndex === 1) {
          // Nếu là trang đầu tiên, thay thế dữ liệu cũ
          this.nodeChildrenMap.set(nodeId, children);
        } else {
          // Nếu là trang tiếp theo, nối vào dữ liệu hiện có
          const existingChildren = this.nodeChildrenMap.get(nodeId) || [];
          this.nodeChildrenMap.set(nodeId, [...existingChildren, ...children]);
        }
        
        // Cập nhật thông tin phân trang
        if (paginationInfo) {
          this.nodePaginationMap.set(nodeId, {
            currentPage: paginationInfo.currentPage,
            totalPages: paginationInfo.totalPages,
            hasNextPage: paginationInfo.hasNextPage,
            isLoadingMore: false
          });
        } else {
          // Nếu không có thông tin phân trang, giả định không còn dữ liệu nếu ít hơn pageSize
          const pagination = this.nodePaginationMap.get(nodeId);
          if (pagination) {
            this.nodePaginationMap.set(nodeId, {
              ...pagination,
              currentPage: pageIndex,
              hasNextPage: children.length === 100, // Còn dữ liệu nếu trả về đủ 100 bản ghi
              isLoadingMore: false
            });
          }
        }
        
        // Đánh dấu đã tải xong
        this.nodeLoadingMap.set(nodeId, false);
      },
      error: (error) => {
        console.error(`Lỗi khi tải danh sách con cho mặt hàng ${nodeId}:`, error);
        this.toastr.error('Không thể tải danh sách mặt hàng con', 'Lỗi');
        this.nodeLoadingMap.set(nodeId, false);
        
        // Cập nhật trạng thái phân trang khi có lỗi
        const pagination = this.nodePaginationMap.get(nodeId);
        if (pagination) {
          pagination.isLoadingMore = false;
          this.nodePaginationMap.set(nodeId, pagination);
        }
      }
    });
  }
  
  // Phương thức mới để tải thêm dữ liệu
  loadMoreChildren(nodeId: string): void {
    // Kiểm tra và lấy thông tin phân trang
    const pagination = this.nodePaginationMap.get(nodeId);
    
    // Chỉ tải thêm nếu: có pagination, còn trang tiếp theo, và không đang tải
    if (pagination && pagination.hasNextPage && !pagination.isLoadingMore && !this.isLoadingChildren(nodeId)) {
      // Tải trang tiếp theo
      const nextPage = pagination.currentPage + 1;
      this.loadChildrenForNode(nodeId, nextPage);
    }
  }
  
  // Phương thức kiểm tra có đang tải thêm không
  isLoadingMore(nodeId: string): boolean {
    const pagination = this.nodePaginationMap.get(nodeId);
    return pagination?.isLoadingMore === true;
  }
  
  // Phương thức kiểm tra còn dữ liệu không
  hasMoreData(nodeId: string): boolean {
    const pagination = this.nodePaginationMap.get(nodeId);
    return pagination?.hasNextPage === true;
  }
  
  // Phương thức xử lý sự kiện cuộn
  onScrollDown(nodeId: string): void {
    // Gọi loadMore cho node cụ thể
    this.loadMoreChildren(nodeId);
  }

  // Thêm phương thức này để xử lý sự kiện cuộn
  onTableScroll(): void {
    // Tìm tất cả các node đang mở và cần tải thêm
    this.expandedRows.forEach((isExpanded, nodeId) => {
      // Chỉ xử lý các node đang mở
      if (isExpanded) {
        // Kiểm tra xem node có cần tải thêm dữ liệu không
        const pagination = this.nodePaginationMap.get(nodeId);
        if (pagination && pagination.hasNextPage && !pagination.isLoadingMore && !this.isLoadingChildren(nodeId)) {
          console.log('Đang tải thêm dữ liệu cho node:', nodeId);
          // Tải dữ liệu cho node đang mở
          this.loadMoreChildren(nodeId);
          // Chỉ tải một node mỗi lần để tránh quá nhiều request
          return;
        }
      }
    });
  }
  
  // Phương thức lựa chọn hàng tối ưu
  selectRow(item: HHThiTruongDto | HHThiTruongTreeNodeDto, event?: Event): void {
    // Ngăn sự kiện lan truyền nếu có
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // Chỉ cập nhật khi chọn hàng khác
    if (this.selectedRowId !== item.id) {
      this.selectedRowId = item.id;
    }
  }

  // Phương thức kiểm tra hàng có đang được chọn hay không
  isRowSelected(itemId: string): boolean {
    return this.selectedRowId === itemId;
  }
  
  // Tính toán độ thụt lề dựa vào cấp độ
  calculateIndent(level: number): string {
    return `${level * 20}px`;
  }
}
