import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, AfterViewInit } from '@angular/core';
import { HangHoa } from '../../models/hanghoathitruong/dm-thitruong';
import { SharedModule } from '../../../../shared/shared.module';
import { TextHighlightPipe } from '../../../../shared/pipes/text-highlight.pipe';

@Component({
  selector: 'app-hang-hoa-table',
  standalone: true,
  imports: [
    SharedModule,
    TextHighlightPipe,
  ],
  templateUrl: './hang-hoa-table.component.html',
  styleUrl: './hang-hoa-table.component.css'
})
export class HangHoaTableComponent implements AfterViewInit {
  @ViewChild('tableContainer') tableContainer!: ElementRef<HTMLDivElement>;
  
  @Input() hangHoas: HangHoa[] = [];
  @Input() selectedHangHoa: HangHoa | null = null;
  @Input() isLoading = false;
  @Input() hasNextPage = true;
  @Input() searchTerm = '';
  
  @Output() selectItem = new EventEmitter<HangHoa>();
  @Output() loadMore = new EventEmitter<void>();

  // Track if we're currently loading more data to prevent multiple requests
  private isLoadingMore = false;

  ngAfterViewInit() {
    // Add scroll event listener directly to the container element
    this.tableContainer.nativeElement.addEventListener('scroll', this.handleScroll.bind(this));
  }

  selectHangHoa(hangHoa: HangHoa): void {
    this.selectItem.emit(hangHoa);
  }

  /**
   * Handle scroll events on the table container
   */
  private handleScroll(): void {
    // Skip if we're already loading, or there's nothing more to load
    if (this.isLoading || !this.hasNextPage || this.isLoadingMore) {
      return;
    }
    
    const element = this.tableContainer.nativeElement;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    
    // Check if we're near bottom (within 200px of bottom)
    const scrollThreshold = 200;
    const isNearBottom = scrollHeight - (scrollTop + clientHeight) < scrollThreshold;
    
    if (isNearBottom) {
      this.isLoadingMore = true;
      
      // Emit the loadMore event
      this.loadMore.emit();
      
      // Reset the loading flag after a delay to prevent multiple triggers
      setTimeout(() => {
        this.isLoadingMore = false;
      }, 1000);
    }
  }
}
