import { HHThiTruongTreeNodeDto } from "./dm-hh-thitruong/HHThiTruongTreeNodeDto";

export interface TreeNode extends HHThiTruongTreeNodeDto {
  level: number;
  expanded?: boolean;
  loading?: boolean;
  parent?: TreeNode;
  loadedChildren?: boolean;
  children: TreeNode[];
}