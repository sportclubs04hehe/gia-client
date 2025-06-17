import { trigger, state, style, transition, animate } from '@angular/animations';
import { Component } from '@angular/core';

@Component({
  selector: 'app-test',
  standalone: true,
  imports: [],
  templateUrl: './test.component.html',
  styleUrl: './test.component.css',
  animations: [
    // trigger('cardExpandCollapse', [
    //   state('collapsed', style({
    //     opacity: 0,
    //     transform: 'scale(0.8) translateX(100%)',
    //     height: '0px',
    //     overflow: 'hidden'
    //   })),
    //   state('expanded', style({
    //     opacity: 1,
    //     transform: 'scale(1) translateX(0)',
    //     height: '*'
    //   })),
    //   transition('collapsed => expanded', [
    //     animate('600ms ease-out')
    //   ]),
    //   transition('expanded => collapsed', [
    //     animate('400ms ease-in')
    //   ])
    // ]),
  ]
})
export class TestComponent {
  //  isExpanded = false;

  //   toggleCard() {
  //     this.isExpanded = !this.isExpanded;
  //   }
}
