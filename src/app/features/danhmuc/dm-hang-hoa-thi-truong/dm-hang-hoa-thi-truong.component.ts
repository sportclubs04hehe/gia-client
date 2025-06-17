import { Component, OnInit, inject, signal, ViewChild, Inject, PLATFORM_ID } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ThemMoiComponent } from './them-moi/them-moi.component';
import { EditComponent } from './edit/edit.component';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../shared/shared.module';
import { debounceTime, distinctUntilChanged, map, of, Subject, switchMap, tap, forkJoin, catchError } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { SearchBarComponent } from '../../../shared/components/search/search-bar/search-bar.component';
import { DeleteConfirmationComponent } from '../../../shared/components/notifications/delete-confirmation/delete-confirmation.component';
import { ActiveButtonComponent } from '../../../shared/components/active-button/active-button.component';
import { TableColumn } from '../../../shared/models/table-column';
import { NgxSpinnerModule } from 'ngx-spinner';
import { SpinnerService } from '../../../shared/services/spinner.service';
import { DmHangHoaThiTruongService } from '../services/api/dm-hang-hoa-thi-truong.service';
import { TextHighlightPipe } from '../../../shared/pipes/text-highlight.pipe';
import { HHThiTruongTreeNodeDto } from '../models/dm-hh-thitruong/HHThiTruongTreeNodeDto';
import { PagedResult } from '../models/helpers/paged-result';
import { TreeNode } from '../models/helpers/tree-node';

@Component({
  selector: 'app-dm-hang-hoa-thi-truong',
  standalone: true,
  imports: [
    SharedModule,
    FormsModule,
    ActiveButtonComponent,
    NgxSpinnerModule,
    TextHighlightPipe,
  ],
  templateUrl: './dm-hang-hoa-thi-truong.component.html',
  styleUrl: './dm-hang-hoa-thi-truong.component.css',
  
})
export class DmHangHoaThiTruongComponent implements OnInit {
  @ViewChild(SearchBarComponent) searchBarComponent!: SearchBarComponent;

  private modalService = inject(NgbModal);
  private hhThiTruongService = inject(DmHangHoaThiTruongService);
  private toastr = inject(ToastrService);
  private spinner = inject(SpinnerService);
  private searchTerms = new Subject<string>();

  isLoadingList = signal(false);
  isSaving = signal(false);
  isLoadingMore = signal(false);
  selectedItem = signal<TreeNode | null>(null);
  flattenedItems = signal<TreeNode[]>([]);
  searchTerm = signal<string>('');
  searchTermModel: string = '';

  tableColumns: TableColumn<TreeNode>[] = [
    {
      header: 'Mã mặt hàng',
      field: 'ma',
      width: '25%',
      paddingFunction: (item: TreeNode) => `padding-left: ${(item.level + 1) * 20}px`
    },
    { header: 'Tên mặt hàng', field: 'ten', width: '45%' },
    {
      header: 'Loại',
      field: 'loaiMatHang',
      width: '15%',
      formatter: (item: TreeNode) => {
        return item.loaiMatHang === 0 ? 'Nhóm' : 'Mặt hàng';
      }
    },
    {
      header: 'Đơn vị tính',
      field: 'tenDonViTinh',
      width: '15%'
    }
  ];

  constructor(@Inject(PLATFORM_ID) private platformId: Object) { }

  ngOnInit() {
    this.setupSearchStream();
    this.loadRootCategories();
  }

  loadRootCategories() {
    this.isLoadingList.set(true);
    this.spinner.showTableSpinner();

    this.hhThiTruongService.getAllParentCategories().subscribe({
      next: (categories) => {
        const rootNodes: TreeNode[] = categories.map(cat => ({
          ...cat,
          level: 0,
          expanded: false,
          children: [], // Khởi tạo mảng rỗng
          loadedChildren: false,
          // Add required pagination properties
          currentPage: 1,
          hasMoreChildren: false,
          totalChildrenCount: 0
        }));

        this.flattenedItems.set(rootNodes);
        this.isLoadingList.set(false);
        this.spinner.hideTableSpinner();
      },
      error: (err) => {
        console.error('Lỗi khi tải danh mục gốc:', err);
        this.toastr.error('Không thể tải danh sách hàng hóa', 'Lỗi');
        this.isLoadingList.set(false);
        this.spinner.hideTableSpinner();
      }
    });
  }

  toggleNode(node: TreeNode) {
    if (node.loading) return;

    if (node.expanded) {
      // Thu gọn node
      this.collapseNode(node);
    } else {
      // Mở rộng node
      if (!node.loadedChildren) {
        this.loadChildrenForNode(node);
      } else {
        this.expandNode(node);
      }
    }
  }

  loadChildrenForNode(node: TreeNode, isLoadingMore: boolean = false) {
    if (!isLoadingMore) {
      node.loading = true;
      node.currentPage = 1;
      node.children = []; // Reset children when first loading
    } else {
      node.loadingMore = true;
    }

    const pageSize = 100; // Number of items per page

    this.hhThiTruongService.getChildrenByParent(node.id, node.currentPage, pageSize).subscribe({
      next: (response: PagedResult<HHThiTruongTreeNodeDto>) => {
        // Process data
        const childrenArray = response.data || [];
        const pagination = response.pagination;

        // Create TreeNode objects from the fetched items
        const childNodes: TreeNode[] = childrenArray.map((child: HHThiTruongTreeNodeDto) => ({
          ...child,
          level: node.level + 1,
          expanded: false,
          parent: node,
          children: [],
          loadedChildren: false,
          currentPage: 1,
          hasMoreChildren: false
        }));

        // Append new children to existing ones if loading more
        if (isLoadingMore) {
          node.children = [...node.children, ...childNodes];
        } else {
          node.children = childNodes;
        }

        // Update pagination state
        node.currentPage = pagination.currentPage;
        node.hasMoreChildren = pagination.hasNextPage;
        node.totalChildrenCount = pagination.totalItems;

        // Update node state
        node.loadedChildren = true;
        node.loading = false;
        node.loadingMore = false;
        node.expanded = true;

        this.updateFlattenedItems();
      },
      error: (err) => {
        console.error(`Lỗi khi tải con của node ${node.id}:`, err);
        node.loading = false;
        node.loadingMore = false;
      }
    });
  }

  // Add method to load more children for a node
  loadMoreChildrenForNode(node: TreeNode) {
    if (!node.hasMoreChildren || node.loadingMore) {
      return;
    }

    node.currentPage += 1;
    this.loadChildrenForNode(node, true);
  }

  expandNode(node: TreeNode) {
    node.expanded = true;
    this.updateFlattenedItems();
  }

  collapseNode(node: TreeNode) {
    node.expanded = false;
    this.updateFlattenedItems();
  }

  updateFlattenedItems() {
    // Lấy các node gốc không có parent
    const rootNodes = this.flattenedItems().filter(item => !item.parent);

    // Tạo danh sách phẳng mới bằng cách duyệt đệ quy tất cả các node
    const newFlattenedItems: TreeNode[] = [];

    for (const rootNode of rootNodes) {
      this.flattenNodeWithChildren(rootNode, newFlattenedItems);
    }

    this.flattenedItems.set(newFlattenedItems);
    this.isLoadingMore.set(false);
  }

  flattenNodeWithChildren(node: TreeNode, result: TreeNode[]) {
    result.push(node);

    if (node.expanded && node.children && node.children.length) {
      for (const child of node.children) {
        this.flattenNodeWithChildren(child as TreeNode, result);
      }
    }
  }

  onSearchChange(term: string): void {
    this.searchTerms.next(term);
  }

  // Thay đổi cách xử lý kết quả tìm kiếm
  setupSearchStream(): void {
    this.searchTerms.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      tap(term => {
        this.isLoadingList.set(true);
        this.spinner.showTableSpinner();
        this.searchTerm.set(term);
      }),
      switchMap(term => {
        if (!term) {
          return this.hhThiTruongService.getAllParentCategories().pipe(
            map(items => items.map(item => this.mapToTreeNode(item, 0)))
          );
        } else {
          // Sử dụng API tìm kiếm phân cấp mới
          return this.hhThiTruongService.searchHierarchical(term);
        }
      })
    ).subscribe({
      next: (items) => {
        // Chuyển đổi dữ liệu thành cấu trúc cây phẳng
        const flattenedNodes = this.processFlattenedTreeNodes(items);
        this.flattenedItems.set(flattenedNodes);
        this.isLoadingList.set(false);
        this.spinner.hideTableSpinner();
      },
      error: (error) => {
        console.error('Lỗi khi tìm kiếm:', error);
        this.isLoadingList.set(false);
        this.spinner.hideTableSpinner();
        this.toastr.error('Không thể thực hiện tìm kiếm', 'Lỗi');
      }
    });
  }

  // Sửa phương thức processFlattenedTreeNodes để đánh dấu node có thể còn con chưa tải
  private processFlattenedTreeNodes(nodes: HHThiTruongTreeNodeDto[]): TreeNode[] {
    const treeNodes: TreeNode[] = [];

    // Đệ quy xử lý node và con của nó
    const processNode = (node: HHThiTruongTreeNodeDto, level: number, parent?: TreeNode): TreeNode => {
      // Loại node = 0 là nhóm, có thể có con
      const isGroup = node.loaiMatHang === 0;

      const treeNode: TreeNode = {
        ...node,
        level,
        expanded: !!node.matHangCon?.length, 
        loadedChildren: !isGroup || !!node.matHangCon?.length,
        children: [],
        parent,
        currentPage: 1,
        hasMoreChildren: isGroup && (!node.matHangCon || node.matHangCon.length === 0)
      };
      // Xử lý con - thêm kiểm tra node.matHangCon tồn tại
      if (node.matHangCon && node.matHangCon.length > 0) {
        treeNode.children = node.matHangCon.map(child =>
          processNode(child, level + 1, treeNode)
        );
      }

      return treeNode;
    };

    // Xử lý từng node gốc
    for (const rootNode of nodes) {
      const processedNode = processNode(rootNode, 0);
      treeNodes.push(processedNode);

      // Thêm các nút con vào danh sách phẳng
      if (processedNode.expanded && processedNode.children?.length) {
        this.addExpandedChildrenToList(processedNode.children, treeNodes);
      }
    }

    return treeNodes;
  }

  // Thêm tất cả các nút con đã mở rộng vào danh sách
  private addExpandedChildrenToList(children: TreeNode[], list: TreeNode[]): void {
    for (const child of children) {
      list.push(child);
      if (child.expanded && child.children?.length) {
        this.addExpandedChildrenToList(child.children, list);
      }
    }
  }

  // Hàm tạo TreeNode từ dữ liệu API
  private mapToTreeNode(item: any, level: number, parent?: TreeNode): TreeNode {
    return {
      ...item,
      level,
      expanded: false,
      children: [],
      loadedChildren: false,
      parent,
      currentPage: 1,
      hasMoreChildren: false
    };
  }

  clearSearch(): void {
    this.searchTermModel = '';
    this.searchTerm.set('');
    this.selectedItem.set(null);
    this.searchTerms.next('');
  }

  selectItem(item: TreeNode): void {
    this.selectedItem.set(item);
  }

  openModal() {
    const modalRef = this.modalService.open(ThemMoiComponent, {
      size: 'xl',
      backdrop: 'static',
      keyboard: false,
      centered: true,
      fullscreen: 'lg',
      scrollable: true
    });

    modalRef.componentInstance.title = 'Thêm mặt hàng';
    modalRef.componentInstance.parentId = this.selectedItem()?.id;

    modalRef.result.then(
      (result) => {
        if (result) {
          this.loadRootCategories();
          this.toastr.success('Thêm mặt hàng thành công', 'Thành công');
        }
      }
    ).catch(() => {
      // Modal was dismissed - no action needed
    });
  }

  openModalEdit(): void {
    if (!this.selectedItem()) {
      this.toastr.warning('Vui lòng chọn một mặt hàng để sửa', 'Thông báo');
      return;
    }

    const modalRef = this.modalService.open(EditComponent, {
      size: 'xl',
      centered: true,
      backdrop: 'static',
    });

    modalRef.componentInstance.title = 'Cập nhật mặt hàng';
    modalRef.componentInstance.item = this.selectedItem();

    modalRef.result.then(
      (updated) => {
        if (updated) {
          this.loadRootCategories();
          this.toastr.success('Cập nhật thành công', 'Thành công');
        }
      }
    ).catch(() => {
      // Modal was dismissed - no action needed
    });
  }

  deleteItem(): void {
    if (!this.selectedItem()) {
      this.toastr.warning('Vui lòng chọn một mặt hàng để xóa', 'Thông báo');
      return;
    }

    const item = this.selectedItem();

    const modalRef = this.modalService.open(DeleteConfirmationComponent, {
      centered: false,
      backdrop: 'static',
    });

    modalRef.result.then(
      (result) => {
        if (result) {
          this.isSaving.set(true);
          this.spinner.showSavingSpinner();

          this.hhThiTruongService.delete(item!.id).subscribe({
            next: () => {
              this.isSaving.set(false);
              this.spinner.hideSavingSpinner();
              this.selectedItem.set(null);
              this.loadRootCategories();
              this.toastr.success(`Đã xóa mặt hàng thành công`, 'Thành công');
            },
            error: (err) => {
              this.isSaving.set(false);
              this.spinner.hideSavingSpinner();
              console.error('Error deleting item:', err);
              this.toastr.error('Có lỗi xảy ra khi xóa mặt hàng. Vui lòng thử lại sau.', 'Lỗi');
            }
          });
        }
      },
      () => {
        // Modal dismissed, do nothing
      }
    );
  }

  onActionButtonClick(action: string): void {
    switch (action) {
      case 'add':
        this.openModal();
        break;
      case 'edit':
        this.openModalEdit();
        break;
      case 'delete':
        this.deleteItem();
        break;
      case 'refresh':
        this.loadRootCategories();
        break;
    }
  }

  // Thêm hàm này vào component của bạn
  getStringValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value);
  }

  onTableScroll() {
    // Find expanded nodes with more children to load
    const expandedNodesWithMoreChildren = this.flattenedItems()
      .filter(node => node.expanded && node.hasMoreChildren && !node.loadingMore);

    if (expandedNodesWithMoreChildren.length > 0) {
      // Only load more for the last expanded node with more children
      // This gives a more natural loading experience
      const nodeToLoadMore = expandedNodesWithMoreChildren[expandedNodesWithMoreChildren.length - 1];

      this.isLoadingMore.set(true);
      this.loadMoreChildrenForNode(nodeToLoadMore);
    }
  }
}
