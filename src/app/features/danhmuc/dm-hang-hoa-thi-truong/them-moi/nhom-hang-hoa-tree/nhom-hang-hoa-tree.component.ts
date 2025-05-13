import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { NhomHangHoaDto } from '../../../models/dm_nhomhanghoathitruong/NhomHangHoaDto';
import { CommonModule } from '@angular/common';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-nhom-hang-hoa-tree',
  standalone: true,
  imports: [CommonModule, NgbModule],
  templateUrl: './nhom-hang-hoa-tree.component.html',
  styleUrl: './nhom-hang-hoa-tree.component.css'
})
export class NhomHangHoaTreeComponent implements OnInit {
  @Input() nhomList: NhomHangHoaDto[] = [];
  @Input() selectedNhomId: string | null = null;
  @Input() expandedNodes: Set<string> = new Set<string>();

  @Output() nodeSelected = new EventEmitter<NhomHangHoaDto>();
  @Output() nodeToggled = new EventEmitter<NhomHangHoaDto>();

  constructor() { }

  ngOnInit(): void { }

  hasChildren(node: NhomHangHoaDto): boolean {
    return !!(node && node.nhomCon && node.nhomCon.length > 0);
  }

  isExpanded(node: NhomHangHoaDto): boolean {
    return !!(node && node.id && this.expandedNodes.has(node.id));
  }

  toggle(node: NhomHangHoaDto): void {
    if (!node?.id) return;

    // Immediately update the UI state
    if (this.expandedNodes.has(node.id)) {
      this.expandedNodes.delete(node.id);
    } else {
      this.expandedNodes.add(node.id);
    }
    
    // Then notify parent
    this.nodeToggled.emit(node);
  }

  selectNode(node: NhomHangHoaDto): void {
    if (!node) return;
    
    // Emit the event synchronously
    this.nodeSelected.emit(node);
  }

  onChildNodeSelected(node: NhomHangHoaDto): void {
    // Directly pass through without additional processing
    this.nodeSelected.emit(node);
  }

  onChildNodeToggled(node: NhomHangHoaDto): void {
    // Directly pass through without additional processing
    this.nodeToggled.emit(node);
  }
}
