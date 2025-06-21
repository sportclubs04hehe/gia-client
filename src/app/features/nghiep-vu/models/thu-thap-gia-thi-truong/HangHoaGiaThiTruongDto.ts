import { Loai } from "../../../danhmuc/models/enum/loai";

export interface HangHoaGiaThiTruongDto {
  id: string;
  ma: string;
  ten: string;
  loaiMatHang: Loai;
  level: number;
  dacTinh: string;
  tenDonViTinh: string;
  giaBinhQuanKyTruoc?: number;
  matHangCon: HangHoaGiaThiTruongDto[];
}