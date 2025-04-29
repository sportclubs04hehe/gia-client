import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild, Inject, PLATFORM_ID, AfterViewInit, Input, Output, EventEmitter } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-sidebars',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './sidebars.component.html',
  styleUrl: './sidebars.component.css'
})
export class SidebarsComponent implements AfterViewInit {
  @Input() isCollapsed = false;
  @Output() collapseChange = new EventEmitter<boolean>();
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngAfterViewInit() {
    if (this.isBrowser) {
      setTimeout(() => {
        this.checkScreenSize();
      });
    }
  }

  @HostListener('window:resize', [])
  checkScreenSize() {
    if (this.isBrowser) {
      const screenWidth = window.innerWidth;
      const shouldBeCollapsed = screenWidth <= 768;
      
      if (this.isCollapsed !== shouldBeCollapsed) {
        this.collapseChange.emit(shouldBeCollapsed);
      }
    }
  }
}