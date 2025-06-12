import { Component } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-themmoi-thuoctinh',
  standalone: true,
  imports: [],
  templateUrl: './themmoi-thuoctinh.component.html',
  styleUrl: './themmoi-thuoctinh.component.css'
})
export class ThemmoiThuoctinhComponent {
  constructor(public activeModal: NgbActiveModal) {}

}
