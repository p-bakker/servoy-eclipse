import { Component, ViewChild, Input, Renderer2, ElementRef, AfterViewInit, EventEmitter, Output, OnDestroy } from '@angular/core';
import { ServoyBaseComponent } from '../../ngclient/servoy_public'
import { IFoundset } from '../../sablo/spectypes.service';
import { LoggerFactory, LoggerService } from '../../sablo/logger.service';
import { ResizeEvent } from 'angular-resizable-element';
import { FoundsetChangeEvent } from '../../ngclient/converters/foundset_converter';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';

@Component( {
    selector: 'servoyextra-table',
    templateUrl: './table.html',
    styleUrls: ['./table.css']
} )
export class ServoyExtraTable extends ServoyBaseComponent implements AfterViewInit, OnDestroy  {
  
    // this is a hack for test, so that this has a none static child ref because the child is in a nested template
    @ViewChild('child', {static: false}) child:ElementRef;
    @ViewChild('element', {static: false}) elementRef:ElementRef;
    @ViewChild(CdkVirtualScrollViewport) viewPort: CdkVirtualScrollViewport;
    
    @Input() foundset : IFoundset;
    @Output() foundsetChange = new EventEmitter();
    @Input() columns;
    @Input() sortDirection: string;
    @Input() enableSort: boolean = true;
    @Input() sortStyleClass: string;
    @Input() sortdownClass: string = "table-servoyextra-sort-down";
    @Input() sortupClass: string = "table-servoyextra-sort-up";
    @Input() visible: boolean;
    @Input() styleClass: string;
    @Input() servoyApi;
    @Input() minRowHeight: any;
    @Input() enableColumnResize: boolean;

    @Input() onViewPortChanged;
    @Input() onCellClick;
    @Input() onCellDoubleClick;
    @Input() onCellRightClick;
    @Input() onHeaderClick;
    @Input() onHeaderRightClick;
    @Input() onColumnResize;
    @Input() onFocusGainedMethodID;
    @Input() onFocusLostMethodID;

    timeoutID: number;
    lastClicked: number;
    sortColumnIndex: number;
    private log: LoggerService;
    columnStyleCache: Array<object> = [];
    autoColumnPercentage: any;
    tableWidth: number = 0;
    scrollWidth: number = 0;
    autoColumns: { [x: string]: any; count: any; length?: any; columns?: {}; minWidth?: {}; autoResize?: {}; };
    componentWidth: any;
    needToUpdateAutoColumnsWidth: boolean = false;
    extraWidth: any;
    extraWidthColumnIdx: any;
    columnCSSRules: any[] = [];
    targetStyleSheet: CSSStyleSheet;
    timeoutid: number;
    skipOnce: boolean = false;
    currentSortClass: any[] = [];
    sortClassUpdateTimer: any;
    changeListener: (change: FoundsetChangeEvent) => void;

    constructor(renderer: Renderer2, logFactory: LoggerFactory ) {
        super(renderer);
        this.log = logFactory.getLogger('Table');
    }

    ngAfterViewInit() {
        super.ngAfterViewInit();

        this.calculateTableWidth();
        const tbody = this.getNativeElement().getElementsByTagName('tbody');
        if(tbody && (tbody[0].scrollHeight > tbody[0].clientHeight && (this.scrollWidth == 0))) {
            this.scrollWidth = tbody[0].offsetWidth - tbody[0].clientWidth + 15;//TODO +2...
        }
        else if(tbody && (tbody[0].scrollHeight <= tbody[0].clientHeight) && (this.scrollWidth > 0)) {
            this.scrollWidth = 0;
        }
       
        this.setColumnsToInitalWidthAndInitAutoColumns();   
        for (let i = 0; i < this.columns.length; i++)
        {
            this.updateTableColumnStyleClass(i, { width: this.columns[i].width, minWidth: this.columns[i].width, maxWidth: this.columns[i].width });
        }
        
        this.attachHandlers();
        //this.addCellHandlers();

        this.changeListener = this.foundset.addChangeListener((event: FoundsetChangeEvent) => {
            if (event.sortColumnsChanged) {
                let sortSet = false;
                let sortColumnsA = this.foundset.sortColumns.split(/[\s,]+/);
                if (sortColumnsA.length >= 2) {
                    for (let i = 0; i < this.columns.length; i++) {
                        if (this.columns[i].dataprovider && sortColumnsA[0] == this.columns[i].dataprovider.idForFoundset) {
                            this.sortColumnIndex = i;
                            this.sortDirection = sortColumnsA[1].toLowerCase() == 'asc' ? 'up' : 'down';
                            sortSet = true;
                            break;
                        }
                    }
                }
                if(!sortSet) {
                    this.sortColumnIndex = -1;
                    this.sortDirection = null;
                }
            }
        });
    }

    ngOnDestroy(): void {
        this.foundset.removeChangeListener(this.changeListener);
    }
    
    attachHandlers() {
        if (this.onHeaderClick || this.onHeaderRightClick) {
            let headers = this.getNativeElement().getElementsByTagName('th');
            for (let i = 0; i < headers.length; i++) {
                if (this.onHeaderClick) {
                    this.renderer.listen(headers[i], 'click', e => this.headerClicked(i, e));
                }
                if (this.onHeaderRightClick) {
                    this.renderer.listen(headers[i], 'contextmenu', e => this.onHeaderRightClick(i, this.sortDirection, e));
                }
            }
        }

        if (this.onFocusGainedMethodID)
        {
            this.renderer.listen(this.getNativeElement().getElementsByTagName("table")[0], 'focus', e => this.onFocusGainedMethodID(e));
        }

        if (this.onFocusLostMethodID)
        {
            this.renderer.listen(this.getNativeElement().getElementsByTagName("table")[0], 'blur', e=> this.onFocusLostMethodID(e));
        }
    }

    private headerClicked(i: number, event?: Event):  void {
        this.onHeaderClick(i, this.sortDirection, event)
            .then((ret: string) => {
                if (ret === "override")
                    return;
                if (this.enableSort) {
                    this.doFoundsetSQLSort(i);
                }
            }, (reason: any) => {
                this.log.error(reason);
            });
    }

    doFoundsetSQLSort(sortColumnIndex: number) {
        if (!this.enableSort) return;
        this.sortColumnIndex = sortColumnIndex;
        if (this.columns[sortColumnIndex].dataprovider) {
            const sortCol = this.columns[sortColumnIndex].dataprovider.idForFoundset;
            let sqlSortDirection: 'asc' | 'desc' = "asc";
            if (this.foundset.sortColumns) {
                let sortColumnsA = this.foundset.sortColumns.split(" ");
                if (sortCol == sortColumnsA[0]) {
                    sqlSortDirection = sortColumnsA[1].toLowerCase() == "asc" ? "desc" : "asc";
                }
            }
            this.foundset.sortColumns = sortCol + " " + sqlSortDirection;
            this.foundset.sort([{ name: sortCol, direction: sqlSortDirection }]);
            this.foundsetChange.emit(this.foundset);
        }
    }

    private addCellHandlers() {
        if (this.onCellClick || this.onCellDoubleClick || this.onCellRightClick) {
            let cells = this.getNativeElement().getElementsByTagName('td');
            for (let i = 0; i < cells.length; i++) {
                let rowIdx = i / this.columns.length + 1;
                let colIdx = i % this.columns.length;
               if (this.onCellDoubleClick && this.onCellClick) {
                    const innerThis: ServoyExtraTable = this;
                    this.renderer.listen(cells[i], 'click', e => {
                        if (innerThis.lastClicked == i) {
                            window.clearTimeout(this.timeoutID);
                            innerThis.lastClicked = -1;
                            innerThis.timeoutID = null;
                            innerThis.onCellDoubleClick(rowIdx, colIdx, innerThis.foundset.viewPort.rows[rowIdx], e);
                        }
                        else {
                            innerThis.lastClicked = i;
                            innerThis.timeoutID = window.setTimeout(() => {
                                innerThis.timeoutID = null;
                                innerThis.lastClicked = -1;
                                innerThis.onCellClick(rowIdx, colIdx, innerThis.foundset.viewPort.rows[rowIdx], e);
                            }, 250);
                        }
                    });
                }
                else if (this.onCellClick) {
                    this.renderer.listen(cells[i], 'click', e => this.onCellClick(rowIdx, colIdx, this.foundset.viewPort.rows[rowIdx], e));
                }
                else if (this.onCellDoubleClick) {
                    this.renderer.listen(cells[i], 'dblclick', e => this.onCellDoubleClick(rowIdx, colIdx, this.foundset.viewPort.rows[rowIdx], e));
                }
                if (this.onCellRightClick)
                    this.renderer.listen(cells[i], 'contextmenu', e => this.onCellRightClick(rowIdx, colIdx, this.foundset.viewPort.rows[rowIdx], e));
            }
        }
    }

    getColumnStyle(column: number) {
        let columnStyle : object = this.columnStyleCache[column];
        if (columnStyle) return columnStyle;
        
        columnStyle = { "overflow": "hidden"};
        this.columnStyleCache[column] = columnStyle;
        const w = this.getNumberFromPxString(this.columns[column].width);
        if (w > -1) {
            columnStyle["min-width"] = columnStyle["max-width"] = columnStyle["width"] = w + "px";
        } else if (this.columns[column].width && (this.columns[column].width) != "auto") {
            columnStyle["width"] = this.columns[column].width;
        } else {
            const autoColumnPercentage = this.getAutoColumnPercentage();
            if(this.autoColumnPercentage) {
                columnStyle["width"] = autoColumnPercentage + "%";
            } else {
                columnStyle["min-width"] = columnStyle["max-width"] = columnStyle["width"] = Math.floor( (this.getComponentWidth() - this.tableWidth - this.scrollWidth) / this.autoColumns.count) + "px";
            }
        }
        this.updateTableColumnStyleClass(column, columnStyle);
        return columnStyle;
    }
    getComponentWidth() {
        if (this.componentWidth === undefined && this.getNativeElement().parentElement.parentElement.clientWidth != 0) {
            this.componentWidth = Math.floor(this.getNativeElement().parentElement.parentElement.clientWidth);
        }
        return this.componentWidth;
    }
    getAutoColumnPercentage() {
        let nrColumnsWithPercentage = 0;
        let sumColumnsWithPercentage = 0;
        if (!this.autoColumns) return null;

        for (let autoColumnIdx in this.autoColumns["columns"]) {
            var w = this.columns[autoColumnIdx].width;
            if (w) {
                w = w.trim();
                if (w.indexOf("%") == w.length - 1) {
                    w = w.substring(0, w.length - 1);
                    if (!isNaN(Number(w))) {
                        nrColumnsWithPercentage++;
                        sumColumnsWithPercentage += Number(w);
                    }
                }
            }
        }

        return nrColumnsWithPercentage ? (100 - sumColumnsWithPercentage) / (this.autoColumns.length - nrColumnsWithPercentage) : 0;
    }

    getNumberFromPxString(s:string) {
        let numberFromPxString = -1;
        if (s) {
            s = s.trim().toLowerCase();
            if (s.indexOf("px") == s.length - 2) {
                s = s.substring(0, s.length - 2);
            }
            if (!isNaN(Number(s))) {
                numberFromPxString = Number(s);
            }
        }
        return numberFromPxString;
    }

    calculateTableWidth() {
        this.tableWidth = 0;
        if (this.columns) {
            for (let i = 0; i < this.columns.length; i++) {
                if (!this.isAutoResizeColumn(i) && this.getNumberFromPxString(this.columns[i].initialWidth) > 0) {
                    let w = this.getNumberFromPxString(this.columns[i].width);
                    if (w > -1) {
                        this.tableWidth += w;
                    }
                }
            }
        }
        return this.tableWidth;
    }
    isAutoResizeColumn(idx: number) {
        return this.columns[idx].autoResize || (this.columns[idx].width == "auto");
    }

    setColumnsToInitalWidthAndInitAutoColumns() {
        let newAutoColumns = { columns: { }, minWidth: { }, autoResize: {}, count: 0 };
        if (this.columns) {
            for (var i = 0; i < this.columns.length; i++) {
                if (this.columns[i].initialWidth == undefined) {
                    this.columns[i].initialWidth = this.columns[i].width == undefined ? "" : this.columns[i].width;
                } else {
                    this.columns[i].width = this.columns[i].initialWidth;
                }

                var minWidth = this.getNumberFromPxString(this.columns[i].width);
                if (this.isAutoResizeColumn(i) || minWidth < 0) {
                    newAutoColumns.columns[i] = true;
                    newAutoColumns.minWidth[i] = minWidth;
                    newAutoColumns.autoResize[i] = this.isAutoResizeColumn(i);
                    newAutoColumns.count += 1;
                }
            }
        }

        this.autoColumns = newAutoColumns;
        this.needToUpdateAutoColumnsWidth = true;
        this.columnStyleCache = [];
    }

    updateAutoColumnsWidth(delta: number) {
        let fixedDelta = delta;

        // if extraWidth was appended to last auto-resize column then remove it, and append it to delta
        if(this.extraWidth) {
            fixedDelta += this.extraWidth;
            let w = this.getNumberFromPxString(this.columns[this.extraWidthColumnIdx].width);
            w += (0 -this.extraWidth);
           this.columns[this.extraWidthColumnIdx].width = w + "px";				
        }

        this.columnStyleCache = [];
        let oldWidth = this.getAutoResizeColumnsWidth();
        let newWidth = oldWidth + fixedDelta;

        let usedDelta = 0;
        let lastAutoColumnIdx = -1;
        for (let i = 0; i < this.columns.length; i++) {
            if (this.autoColumns.autoResize[i]) {
                if (this.autoColumns.minWidth[i] > 0) {
                    var oldW = this.getNumberFromPxString(this.columns[i].width);
                    var w = Math.floor(oldW * newWidth / oldWidth);
                    
                    if (w < this.autoColumns.minWidth[i]) {
                        w = this.autoColumns.minWidth[i];
                    }
                    this.columns[i].width = w + "px";
                    usedDelta += (w - oldW);
                    lastAutoColumnIdx = i;
                } else {
                    this.columns[i].width = this.columns[i].initialWidth;
                }
            }
        }

        if(lastAutoColumnIdx > -1) {
            this.extraWidth = Math.round(Math.abs(fixedDelta) - Math.abs(usedDelta));
            this.extraWidthColumnIdx = lastAutoColumnIdx;
            if(this.extraWidth) {
                if(fixedDelta < 0) this.extraWidth = 0 - this.extraWidth;
                let w = this.getNumberFromPxString(this.columns[lastAutoColumnIdx].width);
                w += this.extraWidth;
                this.columns[lastAutoColumnIdx].width = w + "px";
            }
        }
    }
    

    getAutoResizeColumnsWidth() {
        let autoColumnsWidth = 0;
        for (let i = 0; i < this.columns.length; i++) {
            if (this.autoColumns.autoResize[i] && this.autoColumns.minWidth[i] > 0) {
                autoColumnsWidth += this.getNumberFromPxString(this.columns[i].width);
            }
        }
        return autoColumnsWidth;
    }

    getSortStyleClass(column: number){
        let lv_styles = "";
        if (this.enableSort) {
           if ((this.sortColumnIndex == -1 &&  column == 0) || this.sortColumnIndex == column) 
           {
              lv_styles = this.sortStyleClass;
           }
        }
		return this.columns[column].headerStyleClass == undefined ? lv_styles : lv_styles + " " + this.columns[column].headerStyleClass;
    }

    public getSortClass(column: number) {
        let sortClass = "table-servoyextra-sort-hide";
        if (this.enableSort) {
            let direction;
            let isGetSortFromSQL = this.sortColumnIndex < 0;
            if (column == this.sortColumnIndex) {
                direction = this.sortDirection;
                if (!direction) {
                    isGetSortFromSQL = true;
                }
            }
            if (isGetSortFromSQL) {
                if (this.foundset && this.foundset.sortColumns && this.columns[column].dataprovider) {
                    let sortCol = this.columns[column].dataprovider.idForFoundset;
                    let sortColumnsA = this.foundset.sortColumns.split(" ");

                    if (sortCol == sortColumnsA[0]) {
                        direction = sortColumnsA[1].toLowerCase() == "asc" ? "up" : "down";
                    }
                }
            }

            if (direction) {
                sortClass = "table-servoyextra-sort-show-" + direction + " " + this["sort" + direction + "Class"];
            }
        }
        if (this.currentSortClass.length <= column || this.currentSortClass[column] != sortClass) {
            if (this.sortClassUpdateTimer) window.clearTimeout(this.sortClassUpdateTimer);

            this.sortClassUpdateTimer = window.setTimeout(() => {
                const tbody = this.elementRef !== undefined ? this.getNativeElement().getElementsByTagName('tbody') : undefined;
                if (tbody) {
                    if (tbody) this.updateTBodyStyle(tbody[0]);
                }
            }, 50);
            this.currentSortClass[column] = sortClass;
        }
        return sortClass;
    }
    updateTBodyStyle(tBodyEl: ElementRef) {
        let tBodyStyle = {};
        let componentWidth = this.getComponentWidth();
        tBodyStyle['width'] = componentWidth + "px";
        const tbl = this.getNativeElement().getElementsByTagName("table")[0];
        const tblHead = this.getNativeElement().getElementsByTagName("thead")[0];
        if (tblHead.style.display !== 'none') {
            tBodyStyle['top'] = tblHead.offsetHeight + "px";
        }
        //TODO
        /*if (this.showPagination()) {
            var pagination = $element.find("ul:first");
            if (pagination.get().length > 0) {
                tBodyStyle.marginBottom = ($(pagination).height() + 2) + "px";
            }
        }*/

        for (let p in tBodyStyle) {
            this.renderer.setStyle(tBodyEl, p, tBodyStyle[p]);
        }
    }


    getTHeadStyle() {
        let tHeadStyle = {};
        if (this.enableSort || this.onHeaderClick) {
            tHeadStyle["cursor"] = "pointer";
        }
        //TODO tHeadStyle["left"] = tableLeftOffset + "px";
        return tHeadStyle;
    }

    updateTableColumnStyleClass(columnIndex:number, style:any) {
        if (!this.columnCSSRules[columnIndex]) {
            let clsName = "#table_" + this.servoyApi.getMarkupId() + " .c" + columnIndex;
            if (!this.columnCSSRules[columnIndex]) {
                if (!this.targetStyleSheet) {
                    let elem = document.createElement('style');
                    elem.type = 'text/css';
                    document.getElementsByTagName('head')[0].appendChild(elem);
                    this.targetStyleSheet = document.styleSheets[document.styleSheets.length-1] as CSSStyleSheet;
                }
                let rules = this.targetStyleSheet.cssRules || this.targetStyleSheet.rules;
                this.targetStyleSheet.insertRule(clsName + '{}', rules.length);
                this.columnCSSRules[columnIndex] = rules[rules.length - 1];
                this.columnCSSRules[columnIndex].style["height"] = this.minRowHeight;
            }
        }

        for (var p in style) {
            this.columnCSSRules[columnIndex].style[p] = style[p];
        }
    }

    onResizeEnd(event: ResizeEvent, columnIndex:number): void {
        window.clearTimeout(this.timeoutID);
        const headers = this.getNativeElement().getElementsByTagName('th');
        const newWidth = Math.floor(event.rectangle.width) + "px";
        this.renderer.setStyle(headers[columnIndex], "width", newWidth);
        this.renderer.setStyle(headers[columnIndex], "min-width", newWidth);
        this.renderer.setStyle(headers[columnIndex], "max-width", newWidth);
        this.updateTableColumnStyleClass(columnIndex, { width: newWidth, minWidth: newWidth, maxWidth: newWidth });
        const innerThis: ServoyExtraTable = this;
        this.timeoutID = window.setTimeout(() => {
            innerThis.onColumnResize(event);
            this.timeoutID = null;
        });
    }

    selectRow(idxInFs: number, event: MouseEvent) {
        let newSelection = [idxInFs];
        if (event.ctrlKey) {
            newSelection = this.foundset.selectedRowIndexes ? this.foundset.selectedRowIndexes.slice() : [];
            let idxInSelected = newSelection.indexOf(idxInFs);
            if (idxInSelected == -1) {
                newSelection.push(idxInFs);
            } else if (newSelection.length > 1) {
                newSelection.splice(idxInSelected, 1);
            }
        } else if (event.shiftKey) {
            let start = -1;
            if (this.foundset.selectedRowIndexes) {
                for (let j = 0; j < this.foundset.selectedRowIndexes.length; j++) {
                    if (start == -1 || start > this.foundset.selectedRowIndexes[j]) {
                        start = this.foundset.selectedRowIndexes[j];
                    }
                }
            }
            let stop = idxInFs;
            if (start > idxInFs) {
                stop = start;
                start = idxInFs;
            }
            newSelection = []
            for (let n = start; n <= stop; n++) {
                newSelection.push(n);
            }
        }

        this.foundset.requestSelectionUpdate(newSelection);
        this.foundsetChange.emit(this.foundset);
    }

    onScroll(){
        if(!this.viewPort) return;
        if (this.onViewPortChanged) {
            this.onViewPortChanged(this.viewPort.getRenderedRange().start, this.viewPort.getRenderedRange().end);
        }
    }

    public setSelectedHeader(columnIndex: number) {
        if (this.onHeaderClick) {
            if (this.enableSort && (this.sortColumnIndex != columnIndex)) {
                this.sortDirection = null;
            }
            this.headerClicked(columnIndex);
        } else {
            this.sortColumnIndex = columnIndex;
            this.doFoundsetSQLSort(this.sortColumnIndex);
        }
    }

    public getViewPortPosition() : number[] {
        if (!this.viewPort) return null;
        return [this.viewPort.getRenderedRange().start, this.viewPort.getRenderedRange().end];
    }

    public requestFocus(mustExecuteOnFocusGainedMethod:boolean) {
        let tbl = this.getNativeElement().getElementsByTagName("table")[0];
        this.skipOnce = mustExecuteOnFocusGainedMethod === false;
        tbl.focus();
    }
}