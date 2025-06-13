import { DanhMucBase } from "../../../danhmuc/models/helpers/dm-base";

export interface ThuThapGiaThiTruongCreateDto extends DanhMucBase{
  ngayThuThap: string;
  hangHoaId: string;
  loaiGiaId: string;
}

