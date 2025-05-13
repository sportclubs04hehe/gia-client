import { DanhMucBase } from '../../models/dm-base';
import { NhomHangHoaDto } from './NhomHangHoaDto';
import { HangHoa } from '../dm_hanghoathitruong/dm-thitruong';

export interface NhomHangHoaDetailDto extends DanhMucBase {
  id: string;
  maNhom: string;
  tenNhom: string;
  ngayHieuLuc: string;
  ngayHetHieuLuc: string;
  ghiChu?: string;
  nhomChaId?: string;
  nhomChaName?: string;
  nhomCon: NhomHangHoaDto[]; // Danh sách các nhóm con trực tiếp
  hangHoas: HangHoa[];      // Danh sách hàng hóa thuộc nhóm
}