export interface CodeValidationResult {
  /**
   * Mã có hợp lệ không
   */
  isValid: boolean;
  
  /**
   * Mã đã kiểm tra
   */
  code: string;
  
  /**
   * ID nhóm cha
   */
  parentId?: string;
  
  /**
   * Thông báo chi tiết
   */
  message: string;
  
  /**
   * ID của mục đang được loại trừ khỏi kiểm tra (khi cập nhật)
   */
  exceptId?: string;
}