import { Component } from '@angular/core';
import { SharedModule } from '../../../shared/shared.module';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ThemmoiTt29Component } from './themmoi-tt29/themmoi-tt29.component';

@Component({
  selector: 'app-thu-thap-gia-thi-truong-tt29',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './thu-thap-gia-thi-truong-tt29.component.html',
  styleUrl: './thu-thap-gia-thi-truong-tt29.component.css'
})
export class ThuThapGiaThiTruongTt29Component {
constructor(private modalService: NgbModal) {}

  moModalThemMoi() {
    const modalRef = this.modalService.open(ThemmoiTt29Component, { fullscreen: true });
    modalRef.result.then(
      (result) => {
        if (result === 'saved') {
          console.log('Đã lưu mặt hàng mới');
        }
      },
      () => {}
    );
  }

}
