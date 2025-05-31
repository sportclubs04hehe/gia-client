import { Injectable } from '@angular/core';
import { Observable, Subject, of } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { SpinnerService } from '../../../../shared/services/spinner.service';

@Injectable({
  providedIn: 'root'
})
export class TreeSearchService {
  /* Cache và theo dõi trạng thái tìm kiếm */
  private searchCache = new Map<string, any[]>();
  private searchInProgress = new Map<string, boolean>();
  
  constructor(private spinnerService: SpinnerService) {}
  
  /* Xử lý tìm kiếm với quản lý spinner và bộ nhớ đệm */
  performSearch<T>(
    searchTerm: string,
    searchFn: (term: string) => Observable<T[]>,
    destroy$: Subject<void>,
    minLength = 2,
    spinnerDelay = 400
  ): Observable<T[]> {
    // Clear search if term is too short
    if (!searchTerm || searchTerm.trim().length < minLength) {
      return of([]);
    }
    
    // Normalize search term
    const normalizedTerm = searchTerm.trim().toLowerCase();
    
    // Check cache first
    if (this.searchCache.has(normalizedTerm)) {
      return of(this.searchCache.get(normalizedTerm) as T[]);
    }
    
    // Show spinner after delay
    let spinnerTimeout = setTimeout(() => {
      this.spinnerService.showTableSpinner();
    }, spinnerDelay);
    
    // Perform search
    return searchFn(normalizedTerm).pipe(
      takeUntil(destroy$),
      finalize(() => {
        clearTimeout(spinnerTimeout);
        this.spinnerService.hideTableSpinner();
        this.searchInProgress.set(normalizedTerm, false);
      })
    );
  }
  
  /* Xử lý kết quả tìm kiếm cho cấu trúc cây */
  processSearchResults<T>(
    results: T[],
    treeTableComponent: any,
    processPath: (results: T[]) => void,
    autoExpand: (results: T[]) => void
  ): void {
    if (!results || results.length === 0) {
      return;
    }
    
    setTimeout(() => {
      if (treeTableComponent) {
        // Reset maps in TreeTableComponent
        treeTableComponent.expandedRows = new Map();
        treeTableComponent.nodeChildrenMap = new Map();
        treeTableComponent.nodeLoadingMap = new Map();
        treeTableComponent.nodePaginationMap = new Map();
        
        // Process and expand nodes
        processPath(results);
        treeTableComponent.detectChanges();
        autoExpand(results);
      }
    }, 100);
  }
  
  /* Trích xuất kết quả tìm kiếm từ các định dạng phản hồi khác nhau */
  extractSearchResults<T>(response: any): T[] {
    let results: T[] = [];
    
    // Trích xuất kết quả từ các định dạng phản hồi khác nhau
    if (Array.isArray(response)) {
      results = response;
    } else if (response && response.data && Array.isArray(response.data)) {
      results = response.data;
    } else {
      console.warn('Unexpected search results format:', response);
    }
    
    return results;
  }
  
  /* Tự động mở rộng các node có kết quả tìm kiếm */
  autoExpandSearchResults<T, U>(
    nodes: T[],
    treeTableComponent: any,
    isGroupNode: (node: T) => boolean,
    getNodeChildren: (node: T) => T[],
    convertNodeToEntity: (nodes: T[]) => U[]
  ): void {
    if (!nodes || !treeTableComponent) return;
    
    const allNodes: T[] = [];
    
    // Thu thập tất cả các node và node con của chúng
    const collectNodes = (nodeList: T[]) => {
      if (!Array.isArray(nodeList)) return;
      
      for (const node of nodeList) {
        allNodes.push(node);
        const children = getNodeChildren(node);
        if (children && children.length > 0) {
          collectNodes(children);
        }
      }
    };
    
    // Bắt đầu thu thập
    collectNodes(nodes);
    
    // Xử lý từng node
    for (const node of allNodes) {
      if (isGroupNode(node)) {
        // Mở rộng node và thiết lập thông tin cần thiết
        const nodeId = (node as any).id;
        treeTableComponent.expandedRows.set(nodeId, true);
        
        const children = getNodeChildren(node);
        if (children && children.length > 0) {
          treeTableComponent.nodeChildrenMap.set(nodeId, convertNodeToEntity(children));
          treeTableComponent.nodeLoadingMap.set(nodeId, false);
        }
      }
    }
    
    // Cập nhật giao diện
    treeTableComponent.detectChanges();
    this.spinnerService.hideTableSpinner();
  }
  
  /* Quản lý cache tìm kiếm */
  clearCache(): void {
    this.searchCache.clear();
    this.searchInProgress.clear();
  }
}