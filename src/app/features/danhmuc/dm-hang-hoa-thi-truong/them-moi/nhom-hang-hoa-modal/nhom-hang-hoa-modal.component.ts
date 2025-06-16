import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { NhomHangHoaDetailDto } from '../../../models/dm_nhomhanghoathitruong/NhomHangHoaDetailDto';
import { NhomHangHoaDto } from '../../../models/dm_nhomhanghoathitruong/NhomHangHoaDto';
import { DmNhomHangHoaService } from '../../../services/api/dm-nhom-hang-hoa.service';
import { NhomHangHoaTreeComponent } from '../nhom-hang-hoa-tree/nhom-hang-hoa-tree.component';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject, debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { SearchBarComponent } from '../../../../../shared/components/search/search-bar/search-bar.component';
import { TextHighlightPipe } from '../../../../../shared/pipes/text-highlight.pipe';

@Component({
  selector: 'app-nhom-hang-hoa-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NhomHangHoaTreeComponent,
    SearchBarComponent,
    TextHighlightPipe
  ],
  templateUrl: './nhom-hang-hoa-modal.component.html',
  styleUrl: './nhom-hang-hoa-modal.component.css'
})
export class NhomHangHoaModalComponent implements OnInit {
  @Input() selectedId: string | null = null;

  treeData: NhomHangHoaDto[] = [];
  expandedNodes: Set<string> = new Set<string>();
  isLoading: boolean = true;
  isSearching: boolean = false;
  searchTerm: string = '';
  searchResults: NhomHangHoaDto[] = [];
  selectedNode: NhomHangHoaDto | null = null;

  private allNodes: NhomHangHoaDto[] = [];
  private searchTerms = new Subject<string>();

  constructor(
    public activeModal: NgbActiveModal,
    private nhomHangHoaService: DmNhomHangHoaService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadRootData();
    
    // Setup search terms handling
    this.searchTerms.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(term => {
      this.searchTerm = term;
      this.performSearch();
    });
  }

  loadRootData(): void {
    this.isLoading = true;
    
    this.nhomHangHoaService.getRootNodes()
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response: NhomHangHoaDetailDto) => {
          this.treeData = response.nhomCon || [];
          this.collectAllNodes(this.treeData);
          
          if (this.selectedId) {
            this.expandPathToNode(this.selectedId);
            const node = this.findNodeById(this.selectedId);
            if (node) {
              this.selectedNode = node;
            }
          }
        },
        error: (error) => {
          console.error('Error loading nhóm hàng hóa tree:', error);
        }
      });
  }

  collectAllNodes(nodes: NhomHangHoaDto[]): void {
    if (!nodes) return;
    
    for (const node of nodes) {
      this.allNodes.push(node);
      
      if (node.nhomCon && node.nhomCon.length > 0) {
        this.collectAllNodes(node.nhomCon);
      }
    }
  }

  findNodeById(id: string): NhomHangHoaDto | null {
    return this.allNodes.find(node => node.id === id) || null;
  }

  expandPathToNode(nodeId: string): void {
    const path = this.findPathToNode(nodeId, this.treeData);

    if (path) {
      path.forEach(node => {
        if (node.id !== nodeId) {
          this.expandedNodes.add(node.id);
        }
      });
    }
  }

  findPathToNode(nodeId: string, nodes: NhomHangHoaDto[], path: NhomHangHoaDto[] = []): NhomHangHoaDto[] | null {
    for (const node of nodes) {
      const currentPath = [...path, node];

      if (node.id === nodeId) {
        return currentPath;
      }

      if (node.nhomCon && node.nhomCon.length > 0) {
        const found = this.findPathToNode(nodeId, node.nhomCon, currentPath);
        if (found) {
          return found;
        }
      }
    }

    return null;
  }

  // Updated to work with SearchBarComponent
  onSearch(term: string): void {
    this.searchTerms.next(term);
  }

  performSearch(): void {
    if (!this.searchTerm.trim()) {
      this.clearSearch();
      return;
    }

    this.isSearching = true;
    const term = this.searchTerm.toLowerCase();

    this.searchResults = this.allNodes.filter(node =>
      node.maNhom.toLowerCase().includes(term) ||
      node.tenNhom.toLowerCase().includes(term)
    );
    
    this.isSearching = false;
    this.cdr.detectChanges();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.searchResults = [];
    this.cdr.detectChanges();
  }

  selectNode(node: NhomHangHoaDto): void {
    this.selectedNode = node;
    this.cdr.detectChanges();
  }

  toggleNode(node: NhomHangHoaDto): void {
    // Let the tree component handle toggling
  }

  confirm(): void {
    if (this.selectedNode) {
      this.activeModal.close(this.selectedNode);
    }
  }

  dismiss(): void {
    this.activeModal.dismiss();
  }
}
