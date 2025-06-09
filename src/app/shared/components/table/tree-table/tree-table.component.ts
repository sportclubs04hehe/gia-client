import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { InfiniteScrollDirective } from 'ngx-infinite-scroll';
import { NgxSpinnerModule } from 'ngx-spinner';
import { PagedResult } from '../../../../features/danhmuc/models/helpers/paged-result';
import { NodePagination } from '../../../models/node-pagination';
import { TableColumn } from '../../../models/table-column';
import { TreeNode } from '../../../models/tree-node';
import { CapitalizePipe } from '../../../pipes/capitalize-pipe.pipe';
import { TextHighlightPipe } from '../../../pipes/text-highlight.pipe';

@Component({
  selector: 'app-tree-table',
  standalone: true,
  imports: [CommonModule, InfiniteScrollDirective, NgxSpinnerModule, CapitalizePipe, TextHighlightPipe],
  templateUrl: './tree-table.component.html',
  styleUrl: './tree-table.component.css'
})
export class TreeTableComponent<T extends TreeNode> {
  @Input() rootData: T[] = [];
  @Input() columns: TableColumn<T>[] = [];
  @Input() keyField: keyof T = 'id' as keyof T;
  @Input() loadChildren!: (parentId: string, pageIndex: number, pageSize: number) => Promise<PagedResult<T>> | any;
  @Input() cellRenderer: ((item: T, column: TableColumn<T>) => string | HTMLElement) | undefined;
  @Input() hasChildren!: (node: T) => boolean;
  @Input() defaultPageSize: number = 100;
  @Input() levelField: string = 'level';
  @Input() searchTerm: string = '';

  @Output() rowSelected = new EventEmitter<T>();
  @Output() nodeToggled = new EventEmitter<{ node: T, expanded: boolean }>();

  expandedRows = new Map<string, boolean>();
  nodeChildrenMap = new Map<string, T[]>();
  nodeLoadingMap = new Map<string, boolean>();
  nodePaginationMap = new Map<string, NodePagination>();
  selectedRowId: string | null = null;
  private initialLoadingMap = new Map<string, boolean>();

  constructor(private cdr: ChangeDetectorRef) { }

  // Kiểm tra node có đang mở rộng không
  isNodeExpanded(nodeId: string): boolean {
    return this.expandedRows.get(nodeId) === true;
  }

  // Kiểm tra đang tải con cho node không
  isLoadingChildren(nodeId: string): boolean {
    return this.nodeLoadingMap.get(nodeId) === true;
  }

  // Lấy danh sách con của node
  getNodeChildren(nodeId: string): T[] {
    return this.nodeChildrenMap.get(nodeId) || [];
  }

  // Mở rộng/thu gọn một node
  toggleNode(event: Event, node: T): void {
    // Ngăn chặn sự kiện lan đến hàng
    event.stopPropagation();
    const nodeId = node[this.keyField as keyof T];

    if (!this.isNodeExpanded(nodeId)) {
      // Đánh dấu là đang tải lần đầu khi mở rộng
      this.initialLoadingMap.set(nodeId as string, true);
      // Gọi hàm mở rộng node
      this.expandNode(nodeId);
    } else {
      // Gọi hàm thu gọn node
      this.collapseNode(nodeId);
    }
  }

  // Tải dữ liệu con cho node với phân trang
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

  // Xử lý dữ liệu đã tải
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

      // Xóa cờ đang tải lần đầu khi đã tải xong
      this.initialLoadingMap.set(nodeId, false);
      // Đánh dấu đã tải xong
      this.nodeLoadingMap.set(nodeId, false);
    };
  }

  // Xử lý lỗi khi tải dữ liệu
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

      // Xóa cờ đang tải lần đầu ngay cả khi có lỗi
      this.initialLoadingMap.set(nodeId, false);
    };
  }

  // Tải thêm dữ liệu cho node đã mở rộng
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

  // Kiểm tra có đang tải thêm không
  isLoadingMore(nodeId: string): boolean {
    const pagination = this.nodePaginationMap.get(nodeId);
    return pagination?.isLoadingMore === true;
  }

  // Kiểm tra còn dữ liệu không
  hasMoreData(nodeId: string): boolean {
    const pagination = this.nodePaginationMap.get(nodeId);
    return pagination?.hasNextPage === true;
  }

  // Xử lý sự kiện cuộn cho một node cụ thể
  onScrollDown(nodeId: string): void {
    this.loadMoreChildren(nodeId);
  }

  // Xử lý sự kiện cuộn cho toàn bộ bảng
  onTableScroll(): void {
    // Kiểm tra từng node mở rộng với phân trang để xem có cần tải thêm con không
    this.expandedRows.forEach((expanded, nodeId) => {
      if (!expanded) return;

      const pagination = this.nodePaginationMap.get(nodeId);
      if (!pagination || !pagination.hasNextPage || pagination.isLoadingMore) return;

      this.loadMoreChildren(nodeId);
    });
  }

  // Chọn một hàng
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

  // Kiểm tra hàng có đang được chọn không
  isRowSelected(itemId: string): boolean {
    return this.selectedRowId === itemId;
  }

  // Kiểm tra thuộc tính tồn tại trong node
  hasProperty(node: any, prop: string): boolean {
    return node && Object.prototype.hasOwnProperty.call(node, prop);
  }

  // Tính toán độ thụt lề
  calculateIndent(level: number): string {
    return `${level * 20}px`;
  }

  // Hiển thị giá trị từ cột
  renderCellValue(item: T, column: TableColumn<T>): string {
    if (column.renderer) {
      return column.renderer(item);
    } else if (column.formatter) {
      return column.formatter(item);
    }

    const value = item[column.field as keyof T];
    return value !== undefined && value !== null ? String(value) : '';
  }

  // Cập nhật khi thay đổi dữ liệu
  detectChanges(): void {
    this.cdr.detectChanges();
  }

  // Kiểm tra là nhóm item dựa trên loaiMatHang hoặc loai
  isGroupItem(item: T): boolean {
    const isGroupByLoaiMatHang = 'loaiMatHang' in item && item['loaiMatHang'] === 0;
    const isGroupByLoai = 'loai' in item && item['loai'] === 0;
    return isGroupByLoaiMatHang || isGroupByLoai;
  }


  // Kiểm tra đang tải lần đầu
  isInitialLoading(nodeId: string): boolean {
    return this.initialLoadingMap.get(nodeId) === true;
  }

  // Mở rộng một node
  expandNode(nodeId: string): void {
    this.expandedRows.set(nodeId, true);
    const existingChildren = this.getNodeChildren(nodeId);
    if (existingChildren.length === 0) {
      this.loadChildrenForNode(nodeId);
    }

    const node = this.findNodeById(nodeId);
    if (node) {
      this.nodeToggled.emit({ node, expanded: true });
    }
  }

  // Thu gọn một node
  collapseNode(nodeId: string): void {
    this.expandedRows.set(nodeId, false);

    const node = this.findNodeById(nodeId);
    if (node) {
      this.nodeToggled.emit({ node, expanded: false });
    }
  }

  // Tìm node theo ID
  private findNodeById(nodeId: string): T | null {
    for (const node of this.rootData) {
      if (String(node[this.keyField as keyof T]) === nodeId) {
        return node;
      }
    }

    for (const [, children] of this.nodeChildrenMap.entries()) {
      for (const child of children) {
        if (String(child[this.keyField as keyof T]) === nodeId) {
          return child;
        }
      }
    }

    return null;
  }
}
