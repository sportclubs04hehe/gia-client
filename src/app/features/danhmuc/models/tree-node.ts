import { HHThiTruongTreeNodeDto } from "./dm-hh-thitruong/HHThiTruongTreeNodeDto";

// Add these properties to your TreeNode interface
export interface TreeNode extends HHThiTruongTreeNodeDto {
  level: number;
  expanded?: boolean;
  parent?: TreeNode;
  children: TreeNode[];
  loadedChildren: boolean;
  loading?: boolean;
  hasChildren?: boolean;

  // Pagination tracking properties
  currentPage: number;
  hasMoreChildren: boolean;
  totalChildrenCount?: number;
  loadingMore?: boolean;
}