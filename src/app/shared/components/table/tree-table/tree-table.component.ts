import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { InfiniteScrollDirective } from 'ngx-infinite-scroll';
import { NgxSpinnerModule } from 'ngx-spinner';
import { PagedResult } from '../../../../features/danhmuc/models/paged-result';
import { NodePagination } from '../../../models/node-pagination';
import { TableColumn } from '../../../models/table-column';
import { TreeNode } from '../../../models/tree-node';
import { CapitalizePipe } from '../../../pipes/capitalize-pipe.pipe';

/**
 * Component bảng dữ liệu dạng cây hỗ trợ phân trang và lazy loading
 * Generic T là kiểu dữ liệu của các node trong cây
 */
@Component({
  selector: 'app-tree-table',
  standalone: true,
  imports: [CommonModule, InfiniteScrollDirective, NgxSpinnerModule, CapitalizePipe],
  templateUrl: './tree-table.component.html',
  styleUrl: './tree-table.component.css'
})
export class TreeTableComponent<T extends TreeNode> {
  /**
   * Dữ liệu gốc (cấp cao nhất) của bảng
   */
  @Input() rootData: T[] = [];

  /**
   * Cấu hình các cột hiển thị
   */
  @Input() columns: TableColumn<T>[] = [];

  /**
   * Cột chứa khóa chính để phân biệt mỗi hàng
   */
  @Input() keyField: keyof T = 'id' as keyof T;

  /**
   * Callback tải dữ liệu con (với phân trang)
   */
  @Input() loadChildren!: (parentId: string, pageIndex: number, pageSize: number) => Promise<PagedResult<T>> | any;

  /**
   * Hàm kiểm tra node có con hoặc có thể có con
   */
  @Input() hasChildren!: (node: T) => boolean;

  /**
   * Kích thước trang mặc định
   */
  @Input() defaultPageSize: number = 100;

  /**
   * Tên trường để xác định cấp độ thụt lề
   */
  @Input() levelField: string = 'level';

  /**
   * Sự kiện khi chọn một hàng
   */
  @Output() rowSelected = new EventEmitter<T>();

  /**
   * Sự kiện khi mở/đóng một node
   */
  @Output() nodeToggled = new EventEmitter<{ node: T, expanded: boolean }>();

  /**
   * Lưu trữ trạng thái mở rộng của mỗi node
   */
  expandedRows = new Map<string, boolean>();

  /**
   * Lưu trữ dữ liệu con của mỗi node
   */
  nodeChildrenMap = new Map<string, T[]>();

  /**
   * Lưu trữ trạng thái đang tải của mỗi node
   */
  nodeLoadingMap = new Map<string, boolean>();

  /**
   * Lưu trữ thông tin phân trang cho mỗi node
   */
  nodePaginationMap = new Map<string, NodePagination>();

  /**
   * ID của hàng đang được chọn
   */
  selectedRowId: string | null = null;

  private changeDetectorRef = inject(ChangeDetectorRef);

  constructor() { }

  /**
   * Kiểm tra node có đang mở rộng không
   */
  isNodeExpanded(nodeId: string): boolean {
    return this.expandedRows.get(nodeId) === true;
  }

  /**
   * Kiểm tra đang tải con cho node không
   */
  isLoadingChildren(nodeId: string): boolean {
    return this.nodeLoadingMap.get(nodeId) === true;
  }

  /**
   * Lấy danh sách con của node
   */
  getNodeChildren(nodeId: string): T[] {
    return this.nodeChildrenMap.get(nodeId) || [];
  }

  /**
   * Mở rộng/thu gọn một node
   */
  toggleNode(event: Event, node: T): void {
    // Ngăn chặn sự kiện lan đến hàng
    event.stopPropagation();

    const nodeId = String(node[this.keyField]);
    const isCurrentlyExpanded = this.isNodeExpanded(nodeId);

    // Đảo ngược trạng thái mở rộng
    this.expandedRows.set(nodeId, !isCurrentlyExpanded);

    // Emit sự kiện - để component cha xử lý việc tải dữ liệu
    this.nodeToggled.emit({ node, expanded: !isCurrentlyExpanded });

    // Loại bỏ đoạn code tự tải dữ liệu con
    // Để tránh gọi API trùng lặp với onNodeToggled
  }

  /**
   * Tải dữ liệu con cho node với phân trang
   */
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

    // Gọi callback tải dữ liệu với Promise/Observable
    const result = this.loadChildren(nodeId, pageIndex, this.defaultPageSize);

    // Xử lý kết quả (hỗ trợ cả Promise và Observable)
    if (result.then) {
      // Đây là Promise
      result.then(this.processLoadedData(nodeId, pageIndex))
        .catch(this.handleLoadError(nodeId, pageIndex));
    } else if (result.subscribe) {
      // Đây là Observable
      result.subscribe({
        next: this.processLoadedData(nodeId, pageIndex),
        error: this.handleLoadError(nodeId, pageIndex)
      });
    }
  }

  /**
   * Xử lý dữ liệu đã tải
   */
  private processLoadedData(nodeId: string, pageIndex: number) {
    return (result: any) => {
      // Xử lý dữ liệu trả về
      let children: T[] = []; // Thay đổi kiểu từ TreeNode[] sang T[]
      let paginationInfo = null;

      if (Array.isArray(result)) {
        // Trường hợp API trả về mảng trực tiếp
        children = result as T[]; // Ép kiểu kết quả thành T[]
      } else if (result && 'data' in result) {
        // Trường hợp API trả về đối tượng PagedResult
        children = (result.data || []) as T[]; // Ép kiểu kết quả thành T[]
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
            hasNextPage: children.length === this.defaultPageSize, // Còn dữ liệu nếu trả về đủ bản ghi
            isLoadingMore: false
          });
        }
      }

      // Đánh dấu đã tải xong
      this.nodeLoadingMap.set(nodeId, false);
    };
  }

  /**
   * Xử lý lỗi khi tải dữ liệu
   */
  private handleLoadError(nodeId: string, pageIndex: number) {
    return (error: any) => {
      console.error(`Lỗi khi tải danh sách con cho node ${nodeId}:`, error);
      this.nodeLoadingMap.set(nodeId, false);

      // Cập nhật trạng thái phân trang khi có lỗi
      const pagination = this.nodePaginationMap.get(nodeId);
      if (pagination) {
        pagination.isLoadingMore = false;
        this.nodePaginationMap.set(nodeId, pagination);
      }
    };
  }

  /**
   * Tải thêm dữ liệu cho node đã mở rộng
   */
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

  /**
   * Kiểm tra có đang tải thêm không
   */
  isLoadingMore(nodeId: string): boolean {
    const pagination = this.nodePaginationMap.get(nodeId);
    return pagination?.isLoadingMore === true;
  }

  /**
   * Kiểm tra còn dữ liệu không
   */
  hasMoreData(nodeId: string): boolean {
    const pagination = this.nodePaginationMap.get(nodeId);
    return pagination?.hasNextPage === true;
  }

  /**
   * Xử lý sự kiện cuộn cho một node cụ thể
   */
  onScrollDown(nodeId: string): void {
    this.loadMoreChildren(nodeId);
  }

  /**
   * Xử lý sự kiện cuộn cho toàn bộ bảng
   */
  onTableScroll(): void {
    // Tìm một node đang mở cần tải thêm (để tránh quá nhiều request)
    this.expandedRows.forEach((isExpanded, nodeId) => {
      if (isExpanded) {
        const pagination = this.nodePaginationMap.get(nodeId);
        if (pagination && pagination.hasNextPage && !pagination.isLoadingMore && !this.isLoadingChildren(nodeId)) {
          this.loadMoreChildren(nodeId);
          return; // Chỉ tải một node mỗi lần
        }
      }
    });
  }

  /**
   * Chọn một hàng
   */
  selectRow(item: T, event?: Event): void {
    // Ngăn sự kiện lan truyền nếu có
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const nodeId = String(item[this.keyField]);
    // Chỉ cập nhật khi chọn hàng khác
    if (this.selectedRowId !== nodeId) {
      this.selectedRowId = nodeId;
      this.rowSelected.emit(item);
    }
  }

  /**
   * Kiểm tra hàng có đang được chọn không
   */
  isRowSelected(itemId: string): boolean {
    return this.selectedRowId === itemId;
  }
  
  /**
   * Kiểm tra một thuộc tính có tồn tại trong node không
   */
  hasProperty(node: any, prop: string): boolean {
    return node && Object.prototype.hasOwnProperty.call(node, prop);
  }
  
  /**
   * Tính toán độ thụt lề dựa vào cấp độ
   */
  calculateIndent(level: number): string {
    return `${level * 20}px`;
  }

  /**
   * Hiển thị giá trị từ cột với renderer tùy chỉnh nếu có
   */
  renderCellValue(item: T, column: TableColumn<T>): string {
    if (column.renderer) {
      return column.renderer(item);
    } else if (column.formatter) {
      return column.formatter(item);
    }

    // Lấy giá trị từ trường dữ liệu
    const value = item[column.field as keyof T];
    return value !== undefined && value !== null ? String(value) : '';
  }

  detectChanges(): void {
    if (this.changeDetectorRef) {
      this.changeDetectorRef.markForCheck();
    }
  }

   isGroupItem(item: T): boolean {
    return 'loaiMatHang' in item && item['loaiMatHang'] === 0;
  }
}
