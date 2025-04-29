import { ChangeDetectorRef, Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavbarComponent } from '../navbar/navbar.component';
import { SidebarsComponent } from '../sidebars/sidebars.component';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    NavbarComponent,
    SidebarsComponent,
    CommonModule,
    RouterModule
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent implements OnInit {
  isSidebarCollapsed = false;
  private isBrowser: boolean;
  
  constructor(
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }
  
  ngOnInit() {
    if (this.isBrowser) {
      this.isSidebarCollapsed = window.innerWidth <= 768;
    }
  }

  onToggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    this.cdr.markForCheck();
  }
}
