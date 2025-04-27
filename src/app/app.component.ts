import { Component } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { NavbarComponent } from './features/menu/navbar/navbar.component';
import { SidebarsComponent } from './features/menu/sidebars/sidebars.component';
import { LayoutComponent } from './features/menu/layout/layout.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
  LayoutComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'client';
}
