import { ThuThapGiaChiTietCreateDto } from "../thu-thap-gia-chi-tiet/ThuThapGiaChiTietCreateDto";
import { ThuThapGiaChiTietUpdateDto } from "../thu-thap-gia-chi-tiet/ThuThapGiaChiTietUpdateDto";
import { ThuThapGiaThiTruongCreateDto } from "./ThuThapGiaThiTruongCreateDto";
import { ThuThapGiaThiTruongUpdateDto } from "./ThuThapGiaThiTruongUpdateDto";

export interface CreateThuThapGiaModel {
  thuThapGia: ThuThapGiaThiTruongCreateDto;
  chiTietGia: ThuThapGiaChiTietCreateDto[];
}

export interface UpdateThuThapGiaModel {
  thuThapGia: ThuThapGiaThiTruongUpdateDto;
  chiTietGia: ThuThapGiaChiTietUpdateDto[];
}