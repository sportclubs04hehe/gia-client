import { Loai } from "../enum/loai";

export interface HHThiTruongTreeNodeDto {
  id: string;
  ma: string;
  ten: string;
  loaiMatHang: Loai;
  matHangChaId?: string;
  // Thêm các thuộc tính đơn vị tính
  donViTinhId?: string;
  tenDonViTinh?: string;
  ngayHieuLuc?: string;
  ngayHetHieuLuc?: string;
  ghiChu?: string;
  dacTinh?: string;
  // Đổi tên từ children thành matHangCon để khớp với C#
  matHangCon?: HHThiTruongTreeNodeDto[];
}