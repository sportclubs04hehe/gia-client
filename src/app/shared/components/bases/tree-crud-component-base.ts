import { Directive, ViewChild, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CrudComponentBase } from './crud-component-base';
import { TreeTableComponent } from '../table/tree-table/tree-table.component';
import { SpinnerService } from '../../services/spinner.service';

// Create a minimal interface for required tree node properties
export interface ITreeEntity {
  id: string;
}

/**
 * Base class for CRUD components that work with hierarchical/tree data
 * T: Entity type
 * TNode: Tree node type (often the same as T or extends T)
 */
@Directive()
export abstract class TreeCrudComponentBase<T extends ITreeEntity, TNode = T> extends CrudComponentBase<T> {
  protected override spinnerService = inject(SpinnerService);
  
  @ViewChild(TreeTableComponent) treeTableComponent!: TreeTableComponent<T>;
  
  // Parent nodes (root level items)
  parentItems: T[] = [];
  
  // Currently selected item
  selectedItem: T | null = null;
  
  /**
   * Abstract methods that child classes must implement
   */
  // Get parent ID field name (e.g., 'matHangChaId', 'parentId')
  abstract getParentIdFieldName(): string;
  
  // Check if a node has children or can have children
  abstract hasChildrenForNode(node: T | TNode): boolean;
  
  // Load children for a node with pagination support
  abstract loadChildrenForNode(parentId: string, pageIndex: number, pageSize: number): Observable<any>;
  
  // Convert from tree node to entity if different types
  abstract convertNodeToEntity(nodes: TNode[]): T[];
  
  // Get the full path to an item in the tree
  abstract getFullPathWithChildren(parentId: string, itemId: string): Observable<TNode[]>;
  
  /**
   * Load root level items
   */
  loadParentItems(): void {
    this.spinnerService.showTableSpinner();
    this.loadParentItemsFromService().subscribe({
      next: (data) => {
        this.parentItems = data;
        this.spinnerService.hideTableSpinner();
      },
      error: (error) => {
        console.error('Error loading parent items:', error);
        this.spinnerService.hideTableSpinner();
      }
    });
  }
  
  /**
   * Abstract method to load parent items from service
   */
  abstract loadParentItemsFromService(): Observable<T[]>;
  
  /**
   * Row selection handler
   */
  onRowSelected(item: any): void {
    this.selectedItem = item as T;
  }
  
  /**
   * Node toggle handler (expand/collapse)
   */
  onNodeToggled(event: { node: T, expanded: boolean }): void {
    if (!event.expanded) return;

    const treeTable = this.treeTableComponent;
    if (!treeTable) return;

    const nodeId = event.node.id;
    if (treeTable.nodeChildrenMap.has(nodeId)) return;

    this.loadChildrenForNode(nodeId, 1, treeTable.defaultPageSize).subscribe({
      next: (result) => {
        const data = Array.isArray(result) ? result : result.data;
        const pagination = !Array.isArray(result) ? result.pagination : null;
        
        treeTable.nodeChildrenMap.set(nodeId, this.convertNodeToEntity(data));
        treeTable.nodeLoadingMap.set(nodeId, false);
        
        if (pagination) {
          treeTable.nodePaginationMap.set(nodeId, {
            currentPage: 1,
            totalPages: Math.ceil(pagination.totalItems / treeTable.defaultPageSize),
            hasNextPage: pagination.hasNextPage,
            isLoadingMore: false
          });
        } else {
          treeTable.nodePaginationMap.set(nodeId, {
            currentPage: 1,
            totalPages: 1,
            hasNextPage: false,
            isLoadingMore: false
          });
        }
      }
    });
  }
  
  /**
   * Navigate to an item in the tree and show it
   */
  navigateToItemInTree(parentId: string, item: T): void {
    this.spinnerService.showTableSpinner();
    this.getFullPathWithChildren(parentId, item.id).subscribe({
      next: (pathTree) => {
        if (!pathTree?.length) {
          this.spinnerService.hideTableSpinner();
          return;
        }

        // Update root data if needed
        pathTree.forEach(rootNode => {
          const entityNode = this.convertNodeToEntity([rootNode])[0];
          const existingRoot = this.parentItems.find(x => x.id === entityNode.id);
          if (!existingRoot) {
            this.parentItems = [...this.parentItems, entityNode];
          }
        });

        // Process tree path nodes
        this.processTreePath(pathTree);
        
        // Select and scroll to the item
        this.selectAndScrollToItem(item);
        this.spinnerService.hideTableSpinner();
      },
      error: (error) => {
        console.error('Error loading path:', error);
        this.spinnerService.hideTableSpinner();
        this.loadParentItems();
      }
    });
  }
  
  /**
   * Update node in tree (when information changes or node moves)
   */
  protected updateNodeInTree(updatedItem: T, originalParentId?: string | null): void {
    const parentIdField = this.getParentIdFieldName();
    const parentChanged = originalParentId !== (updatedItem as any)[parentIdField];

    if (parentChanged) {
      this.relocateNodeInTree(updatedItem, originalParentId);
    } else {
      this.updateNodeInPlace(updatedItem);
    }

    // Update selected item
    if (this.selectedItem?.id === updatedItem.id) {
      this.selectedItem = {...updatedItem};
    }
    
    this.scrollToSelectedItem(updatedItem.id);
  }
  
  /**
   * Update node information without changing position
   */
  protected updateNodeInPlace(updatedItem: T): void {
    const treeTable = this.treeTableComponent;
    let updated = false;

    // Update in root list
    const rootIndex = this.parentItems.findIndex(x => x.id === updatedItem.id);
    if (rootIndex >= 0) {
      this.parentItems[rootIndex] = {...updatedItem};
      this.parentItems = [...this.parentItems];
      updated = true;
    }

    // Update in node children
    if (treeTable) {
      treeTable.nodeChildrenMap.forEach((children, parentId) => {
        const childIndex = children.findIndex(x => x.id === updatedItem.id);
        if (childIndex >= 0) {
          const updatedChildren = [...children];
          updatedChildren[childIndex] = {...updatedItem};
          treeTable.nodeChildrenMap.set(parentId, updatedChildren);
          updated = true;
        }
      });

      if (updated && treeTable.detectChanges) {
        setTimeout(() => treeTable.detectChanges());
      }
    }
  }
  
  /**
   * Move node to a new position in the tree
   */
  protected relocateNodeInTree(updatedItem: T, originalParentId?: string | null): void {
    const treeTable = this.treeTableComponent;
    if (!treeTable) return;
    
    const parentIdField = this.getParentIdFieldName();
    const currentParentId = (updatedItem as any)[parentIdField];

    // 1. Remove from old position
    if (originalParentId) {
      const oldParentChildren = treeTable.nodeChildrenMap.get(originalParentId);
      if (oldParentChildren) {
        treeTable.nodeChildrenMap.set(originalParentId, 
          oldParentChildren.filter(x => x.id !== updatedItem.id));
      }
    } else {
      this.parentItems = this.parentItems.filter(x => x.id !== updatedItem.id);
    }

    // 2. Add to new position
    if (currentParentId) {
      if (treeTable.nodeChildrenMap.has(currentParentId)) {
        const newParentChildren = treeTable.nodeChildrenMap.get(currentParentId) || [];
        if (!newParentChildren.some(x => x.id === updatedItem.id)) {
          treeTable.nodeChildrenMap.set(
            currentParentId,
            [...newParentChildren, updatedItem]
          );
        }
      }
      // Open path to the new node
      this.navigateToItemInTree(currentParentId, updatedItem);
    } else {
      if (!this.parentItems.some(x => x.id === updatedItem.id)) {
        this.parentItems = [...this.parentItems, updatedItem];
      }
    }

    // Update UI
    if (treeTable.detectChanges) {
      setTimeout(() => treeTable.detectChanges());
    }
  }
  
  /**
   * Remove deleted item from UI
   */
  protected removeDeletedItemFromUI(deletedItem: T): void {
    const treeTable = this.treeTableComponent;
    const parentIdField = this.getParentIdFieldName();
    const parentId = (deletedItem as any)[parentIdField];
    
    // Remove from root list if it's a top-level item
    if (!parentId) {
      this.parentItems = this.parentItems.filter(item => item.id !== deletedItem.id);
    }
    
    // Remove from nodeChildrenMap in TreeTable
    if (treeTable && parentId) {
      const parentChildren = treeTable.nodeChildrenMap.get(parentId);
      if (parentChildren) {
        treeTable.nodeChildrenMap.set(
          parentId,
          parentChildren.filter(item => item.id !== deletedItem.id)
        );
        
        // Force update UI
        if (treeTable.detectChanges) {
          setTimeout(() => treeTable.detectChanges());
        }
      }
    }
    
    // Reset selected item if it was the deleted one
    if (this.selectedItem?.id === deletedItem.id) {
      this.selectedItem = null;
    }
  }
  
  /**
   * Process tree path and expand nodes
   */
  protected processTreePath(nodes: TNode[]): void {
    const treeTable = this.treeTableComponent;
    if (!treeTable) return;

    for (const node of nodes) {
      // Skip nodes without children
      const children = this.getNodeChildren(node);
      if (!children || !children.length) continue;
      
      // Expand node and save children data
      const nodeId = this.getNodeId(node);
      treeTable.expandedRows.set(nodeId, true);
      
      const convertedData = this.convertNodeToEntity(children);
      treeTable.nodeChildrenMap.set(nodeId, convertedData);
      treeTable.nodeLoadingMap.set(nodeId, false);
      
      treeTable.nodePaginationMap.set(nodeId, {
        currentPage: 1,
        totalPages: Math.ceil(children.length / treeTable.defaultPageSize),
        hasNextPage: false,
        isLoadingMore: false
      });
      
      // Process children recursively
      this.processTreePath(children);
    }
  }
  
  /**
   * Get children of a node (helper method to handle different node structures)
   */
  protected getNodeChildren(node: any): TNode[] {
    // Override this if your tree nodes have a different structure
    return node.children || node.matHangCon || [];
  }
  
  /**
   * Get ID of a node (helper method to handle different node structures)
   */
  protected getNodeId(node: any): string {
    return node.id;
  }
  
  /**
   * Select an item and scroll to its position
   */
  protected selectAndScrollToItem(item?: T): void {
    if (!item?.id) return;
    
    setTimeout(() => {
      this.selectedItem = item;
      if (this.treeTableComponent) {
        this.treeTableComponent.selectedRowId = item.id;
      }
      this.scrollToSelectedItem(item.id);
    }, 200);
  }
  
  /**
   * Scroll to the selected element in the UI
   */
  protected scrollToSelectedItem(itemId: string): void {
    try {
      setTimeout(() => {
        const element = document.querySelector(`[data-id="${itemId}"]`);
        if (!element) return;
        
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('highlight-animation');

        setTimeout(() => {
          element.classList.remove('highlight-animation');
        }, 2000);
      }, 100);
    } catch (error) {
      console.error('Error scrolling to element:', error);
    }
  }
}