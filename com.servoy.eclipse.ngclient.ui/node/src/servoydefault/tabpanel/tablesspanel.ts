import { Component, } from '@angular/core';

import {BaseTabpanel,Tab} from "./basetabpanel"

import { WindowRefService } from '../../sablo/util/windowref.service'

import { LoggerFactory } from '../../sablo/logger.service'

@Component( {
    selector: 'servoydefault-tablesspanel',
    templateUrl: './tablesspanel.html'
} )
export class ServoyDefaultTablesspanel extends BaseTabpanel {
    constructor(windowRefService: WindowRefService, logFactory : LoggerFactory) {
       super(windowRefService, logFactory);
    }
}