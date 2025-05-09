import { Injectable } from '@angular/core';
import { HangHoaCreateDto } from '../models/dm_hanghoathitruong/hh-thitruong-create';
import * as XLSX from 'xlsx';
import { DmDonViTinhService } from './dm-don-vi-tinh.service';
import { lastValueFrom } from 'rxjs';
import { DonViTinhCreateDto } from '../models/dm_donvitinh/don-vi-tinh_create.dto';

export interface ExcelImportResult {
  items: HangHoaCreateDto[];
  duplicates: { code: string; rows: number[] }[];
  newDonViTinhs: DonViTinhCreateDto[]; // Track new units
}

@Injectable({
  providedIn: 'root'
})
export class HHThiTruongExcelImportService {
  constructor(private donViTinhService: DmDonViTinhService) {}

  async importHangHoaFromExcel(file: File): Promise<ExcelImportResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e: any) => {
        try {
          const data = e.target.result;
          const wb: XLSX.WorkBook = XLSX.read(data, { type: 'array' });
          const wsname: string = wb.SheetNames[0];
          const ws: XLSX.WorkSheet = wb.Sheets[wsname];
          const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 });
          const headers = jsonData[0] as string[];

          this.validateHeaders(headers);

          // Extract all unique đơn vị tính names
          const donViTinhNames = new Set<string>();
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i] as any[];
            if (row.length === 0 || row.every(cell => cell === null || cell === undefined)) {
              continue;
            }
            
            const donViTinhIndex = headers.indexOf('donViTinh');
            if (donViTinhIndex !== -1 && row[donViTinhIndex]) {
              donViTinhNames.add(String(row[donViTinhIndex]).trim());
            }
          }
          
          // Process đơn vị tính if any exist in the file
          const donViTinhMap = new Map<string, string>(); // Maps name to ID
          const newDonViTinhs: DonViTinhCreateDto[] = [];
          
          if (donViTinhNames.size > 0) {
            try {
              // Check which đơn vị tính exist and which need to be created
              for (const name of donViTinhNames) {
                try {
                  const existsResult = await lastValueFrom(this.donViTinhService.existsByMa(name));
                  if (!existsResult.data) {
                    // Create a new đơn vị tính with all required fields
                    const currentDate = new Date();
                    const futureDate = new Date();
                    futureDate.setFullYear(futureDate.getFullYear() + 10); // Set expiry 10 years in future
                  
                    const newDonViTinh: DonViTinhCreateDto = {
                      ma: name,
                      ten: name,
                      ghiChu: `Tự động tạo khi nhập Excel ngày ${new Date().toLocaleDateString('vi-VN')}`,
                      ngayHieuLuc: currentDate.toISOString(),
                      ngayHetHieuLuc: futureDate.toISOString(),
                      // Add any other required properties from DanhMucBase here if needed
                    };
                    newDonViTinhs.push(newDonViTinh);
                  }
                } catch (error) {
                  console.error(`Error checking đơn vị tính ${name}:`, error);
                }
              }
              
              // Create new đơn vị tính if any
              if (newDonViTinhs.length > 0) {
                const createdDonViTinhs = await lastValueFrom(this.donViTinhService.createMany(newDonViTinhs));
                createdDonViTinhs.forEach(dvt => {
                  donViTinhMap.set(dvt.ma, dvt.id || '');
                });
              }
              
              // Fetch all existing đơn vị tính that we need
              for (const name of donViTinhNames) {
                if (!donViTinhMap.has(name)) {
                  try {
                    const donViTinh = await lastValueFrom(this.donViTinhService.getByMa(name));
                    if (donViTinh && donViTinh.id) {
                      donViTinhMap.set(name, donViTinh.id);
                    } else {
                      console.warn(`Retrieved đơn vị tính ${name} but it has no valid ID.`);
                    }
                  } catch (error) {
                    console.error(`Error fetching đơn vị tính ${name}:`, error);
                    // Create an alert message or handle this specific error
                  }
                }
              }
            } catch (error) {
              reject(error);
              return;
            }
          }
          
          // Process hangHoa rows
          const hangHoas: HangHoaCreateDto[] = [];
          const codeMap = new Map<string, number[]>();
          const duplicates: { code: string; rows: number[] }[] = [];
          
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i] as any[];
            if (row.length === 0 || row.every(cell => cell === null || cell === undefined)) {
              continue;
            }
            
            const hangHoa = this.mapRowToHangHoaDto(row, headers);
            
            // Set donViTinhId if available
            const donViTinhIndex = headers.indexOf('donViTinh');
            if (donViTinhIndex !== -1 && row[donViTinhIndex]) {
              const donViTinhName = String(row[donViTinhIndex]).trim();
              const donViTinhId = donViTinhMap.get(donViTinhName);
              if (donViTinhId) {
                hangHoa.donViTinhId = donViTinhId;
              }
            }
            
            // Duplicate checking logic
            if (hangHoa.maMatHang) {
              const code = hangHoa.maMatHang;
              const rowNum = i + 1; 
              
              if (!codeMap.has(code)) {
                codeMap.set(code, [rowNum]);
              } else {
                const rows = codeMap.get(code)!;
                rows.push(rowNum);
                
                if (rows.length === 2) {
                  duplicates.push({ code, rows: [...rows] });
                } else {
                  const existingDup = duplicates.find(d => d.code === code);
                  if (existingDup) {
                    existingDup.rows = [...rows];
                  }
                }
              }
            }
            
            hangHoas.push(hangHoa);
          }
          
          resolve({
            items: hangHoas,
            duplicates,
            newDonViTinhs
          });
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = (error) => {
        reject(error);
      };

      reader.readAsArrayBuffer(file);
    });
  }

  generateTemplate(): void {
    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet([
      ['maMatHang', 'tenMatHang', 'donViTinh', 'ghiChu', 'ngayHieuLuc', 'ngayHetHieuLuc'],
      ['MH001', 'Áo thun nam', 'Cái', 'Hàng nhập khẩu', '01/01/2025', '31/12/2025']
    ]);

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');

    XLSX.writeFile(wb, 'mau-hang-hoa-tt29.xlsx');
  }

  private validateHeaders(headers: string[]): void {
    const requiredHeaders = ['maMatHang', 'tenMatHang', 'ngayHieuLuc', 'donViTinh'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

    if (missingHeaders.length > 0) {
      throw new Error(`Thiếu các cột bắt buộc: ${missingHeaders.join(', ')}`);
    }
  }

  private mapRowToHangHoaDto(row: any[], headers: string[]): HangHoaCreateDto {
    const dto: HangHoaCreateDto = {} as HangHoaCreateDto;

    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      const value = row[j];

      if (value !== undefined && value !== null) {
        switch (header) {
          case 'maMatHang':
            dto.maMatHang = String(value).trim();
            break;
          case 'tenMatHang':
            dto.tenMatHang = String(value).trim();
            break;
          case 'ghiChu':
            dto.ghiChu = String(value).trim();
            break;
          case 'ngayHieuLuc':
            dto.ngayHieuLuc = this.parseExcelDate(value);
            break;
          case 'ngayHetHieuLuc':
            dto.ngayHetHieuLuc = this.parseExcelDate(value);
            break;
          // We handle donViTinh separately with donViTinhMap
        }
      }
    }

    return dto;
  }

  private parseExcelDate(value: any): string {
    // Existing date parsing code (unchanged)
    if (!value) return new Date().toISOString();

    let date: Date;

    if (typeof value === 'number') {
      date = new Date(Math.round((value - 25569) * 86400 * 1000));
    }
    else if (typeof value === 'string') {
      const parts = value.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        date = new Date(year, month, day);
      } else {
        try {
          date = new Date(value);
        } catch (error) {
          return new Date().toISOString();
        }
      }
    } else {
      try {
        date = new Date(value);
      } catch (error) {
        return new Date().toISOString();
      }
    }

    if (isNaN(date.getTime())) {
      return new Date().toISOString();
    }

    return date.toISOString();
  }
}
