import { LoaiMatHangEnum } from "./HHThiTruongDto";

export interface HHThiTruongTreeNodeDto {
  id: string;
  ma: string;
  ten: string;
  loaiMatHang: LoaiMatHangEnum;
  matHangChaId?: string;
  // Thêm các thuộc tính đơn vị tính
  donViTinhId?: string;
  tenDonViTinh?: string;
  // Đổi tên từ children thành matHangCon để khớp với C#
  matHangCon?: HHThiTruongTreeNodeDto[];
}