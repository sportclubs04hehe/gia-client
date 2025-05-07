import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'textHighlight',
  standalone: true,
})
export class TextHighlightPipe implements PipeTransform {

  constructor(private sanitizer: DomSanitizer) {}

  transform(text: string, searchTerm: string): SafeHtml {
    if (!searchTerm || !text) {
      return this.sanitizer.bypassSecurityTrustHtml(text || '');
    }
    
    const regex = new RegExp(this.escapeRegex(searchTerm), 'gi');
    const newText = text.replace(regex, match => 
      `<span class="highlight-text">${match}</span>`);
    
    return this.sanitizer.bypassSecurityTrustHtml(newText);
  }

  private escapeRegex(string: string): string {
    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  }
  

}
