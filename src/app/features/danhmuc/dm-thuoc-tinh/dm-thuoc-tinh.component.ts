import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { NgxSpinnerModule } from 'ngx-spinner';
import { ActiveButtonComponent } from '../../../shared/components/active-button/active-button.component';
import { TreeTableComponent } from '../../../shared/components/table/tree-table/tree-table.component';
import { TableColumn } from '../../../shared/models/table-column';
import { TreeCrudComponentBase } from '../../../shared/components/bases/tree-crud-component-base';
import { DmThuocTinhDto } from '../models/dm_thuoctinh/DmThuocTinhDto';
import { DmThuocTinhTreeNodeDto } from '../models/dm_thuoctinh/DmThuocTinhTreeNodeDto';
import { DmThuocTinhService } from '../services/api/dm-thuoc-tinh.service';
import { Loai } from '../models/enum/loai';

@Component({
  selector: 'app-dm-thuoc-tinh',
  standalone: true,
  imports: [
    CommonModule,
    ActiveButtonComponent,
    NgxSpinnerModule,
    TreeTableComponent
  ],
  templateUrl: './dm-thuoc-tinh.component.html',
  styleUrl: './dm-thuoc-tinh.component.css'
})
export class DmThuocTinhComponent extends TreeCrudComponentBase<DmThuocTinhDto, DmThuocTinhTreeNodeDto> implements OnInit {
  private dmThuocTinhService = inject(DmThuocTinhService);
  
  @ViewChild(TreeTableComponent) override treeTableComponent!: TreeTableComponent<DmThuocTinhDto>;

  columns: TableColumn<DmThuocTinhDto>[] = [
    { field: 'ma', header: 'Mã', width: '15%' },
    { field: 'ten', header: 'Tên', width: '40%' },
    { field: 'loai', header: 'Loại', width: '15%' },
    { field: 'ngayHieuLuc', header: 'Ngày hiệu lực', width: '15%' },
    { field: 'ngayHetHieuLuc', header: 'Ngày hết hiệu lực', width: '15%' }
  ];

  constructor() {
    super();
    this.loadChildrenForNode = this.loadChildrenForNode.bind(this);
  }

  ngOnInit(): void {
    this.loadParentItems();
  }

  // Action button handler for refresh
  onButtonAction(action: string): void {
    if (action === 'refresh') {
      if (this.treeTableComponent) {
        this.treeTableComponent.expandedRows.clear();
        this.treeTableComponent.nodeChildrenMap.clear();
        this.treeTableComponent.nodeLoadingMap.clear();
        this.treeTableComponent.nodePaginationMap.clear();
        this.treeTableComponent.selectedRowId = '';
      }
      this.selectedItem = null;
      this.loadParentItems();
    }
  }

  // Required abstract method implementations
  override getParentIdFieldName(): string {
    return 'thuocTinhChaId';
  }

  override hasChildrenForNode(node: DmThuocTinhDto | DmThuocTinhTreeNodeDto): boolean {
   return node.loai === Loai.Cha;
  }

  override loadChildrenForNode(parentId: string, pageIndex: number, pageSize: number): Observable<any> {
    return this.dmThuocTinhService.getChildrenByParent(parentId, { pageIndex, pageSize });
  }

  override convertNodeToEntity(nodes: DmThuocTinhTreeNodeDto[]): DmThuocTinhDto[] {
    if (!nodes || !Array.isArray(nodes)) {
      return [];
    }

    return nodes.map(node => ({
      id: node.id,
      stt: node.stt,
      ma: node.ma,
      ten: node.ten,
      loai: node.loai,
      ghiChu: node.ghiChu,
      dinhDang: node.dinhDang,
      width: node.width,
      congThuc: node.congThuc,
      canChinhCot: node.canChinhCot,
      ngayHieuLuc: node.ngayHieuLuc,
      ngayHetHieuLuc: node.ngayHetHieuLuc,
      thuocTinhChaId: node.thuocTinhChaId
    } as DmThuocTinhDto));
  }

  override getFullPathWithChildren(parentId: string, itemId: string): Observable<DmThuocTinhTreeNodeDto[]> {
    return this.dmThuocTinhService.getFullPathWithChildren(itemId, parentId);
  }

  override loadParentItemsFromService(): Observable<DmThuocTinhDto[]> {
    return this.dmThuocTinhService.getAllParentCategories();
  }

  protected override getNodeChildren(node: any): DmThuocTinhTreeNodeDto[] {
    return node.thuocTinhCon || [];
  }

  // Required stub methods
  override getItemById(id: string): Observable<DmThuocTinhDto> {
    return this.dmThuocTinhService.getById(id);
  }

  override getEntityName(): string {
    return 'thuộc tính';
  }

  override handleItemCreated(result: any): void {}
  override handleItemUpdated(item: DmThuocTinhDto, originalData?: any): void {}
  override handleItemDeleted(item: DmThuocTinhDto, additionalInfo?: any): void {}
}
