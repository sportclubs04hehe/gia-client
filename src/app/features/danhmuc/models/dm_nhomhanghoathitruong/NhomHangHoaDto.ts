import { DanhMucBase } from '../helpers/dm-base';

export interface NhomHangHoaDto extends DanhMucBase {
  id: string;        // Đảm bảo id luôn tồn tại và không undefined
  maNhom: string;
  tenNhom: string;
  ngayHieuLuc: string;
  ngayHetHieuLuc: string;
  ghiChu?: string;
  nhomChaId?: string;
  nhomCon?: NhomHangHoaDto[]; // Thêm thuộc tính nhomCon là optional
}