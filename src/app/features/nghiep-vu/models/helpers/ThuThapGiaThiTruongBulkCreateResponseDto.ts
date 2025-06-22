import { ThuThapGiaThiTruongDto } from "../thu-thap-gia-thi-truong/ThuThapGiaThiTruongDto";

export interface ThuThapGiaThiTruongBulkCreateResponseDto {
  totalCreated: number;
  totalSkipped: number;
  createdItems: ThuThapGiaThiTruongDto[];
  errors: string[];
  warnings: string[];
}