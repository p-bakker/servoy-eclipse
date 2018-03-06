import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';


import { MainComponent } from './main.component';
import { FormService } from './form.service';
import { ServoyService } from './servoy.service';

import { FormComponent, AddAttributeDirective } from './form/form_component.component';

import { SabloModule } from '../sablo/sablo.module'

import { AllServicesModules } from './allservices.service';
import { AllComponentsModule } from './allcomponents.module';


//COMPONENT_IMPORTS_START
//import { ServoyDefaultTextField } from '../servoydefault/textfield/textfield';
//import { ServoyDefaultButton } from '../servoydefault/button/button';
//import { ServoyDefaultLabel} from '../servoydefault/label/label';
//import { ServoyDefaultTabpanel} from '../servoydefault/tabpanel/tabpanel';
//COMPONENT_IMPORTS_END

@NgModule( {
    declarations: [
        MainComponent,
        FormComponent,
        AddAttributeDirective,
        // COMPONENT_DECLARATIONS_START
//        ServoyDefaultTextField,
//        ServoyDefaultButton,
//        ServoyDefaultLabel,
//        ServoyDefaultTabpanel,
        // COMPONENT_DECLARATIONS_END
    ],
    imports: [
        BrowserModule,
        NgbModule.forRoot(),
        SabloModule,
		AllComponentsModule,
        AllServicesModules,
        // COMPONENT_MODULE_IMPORTS_START
        // COMPONENT_MODULE_IMPORTS_END
    ],
    providers: [FormService, ServoyService],
    bootstrap: [MainComponent]
} )
export class ServoyModule { }