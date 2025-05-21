/**
 * Interface cho node trong bảng dữ liệu dạng cây
 */
export interface TreeNode {
  id: string;
  [key: string]: any; // Cho phép các thuộc tính khác tùy theo mỗi loại dữ liệu
}
