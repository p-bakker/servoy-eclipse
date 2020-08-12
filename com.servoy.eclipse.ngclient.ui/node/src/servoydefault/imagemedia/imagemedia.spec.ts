import { async, ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import { SabloModule } from '../../sablo/sablo.module'
import { ServoyPublicModule } from '../../ngclient/servoy_public.module'
import { ServoyDefaultImageMedia } from './imagemedia';
import { ServoyService } from '../../ngclient/servoy.service';
import { I18NProvider } from '../../ngclient/services/i18n_provider.service';
import { FormattingService,TooltipService, SvyUtilsService, ServoyApi} from '../../ngclient/servoy_public'
import { UploadDirective } from "../../ngclient/utils/upload.directive";
import { DebugElement, NgModule } from '@angular/core';
import { ApplicationService } from '../../ngclient/services/application.service';
import { By } from '@angular/platform-browser';
import { FileUploadWindowComponent } from '../../ngclient/services/file-upload-window/file-upload-window.component';
import { ViewportService } from '../../ngclient/services/viewport.service';
import { FormService } from '../../ngclient/form.service';

@NgModule({
  declarations: [FileUploadWindowComponent],
  entryComponents: [
    FileUploadWindowComponent,
  ]
})
class TestModule {}


describe("ServoyDefaultImageMedia", () => {
  let component: ServoyDefaultImageMedia;
  let fixture: ComponentFixture<ServoyDefaultImageMedia>;
  let imgUpload : DebugElement[];
  let applicationService: any;
  let servoyApi : any;

  beforeEach(() => {

    applicationService = jasmine.createSpyObj("ApplicationService", ["showFileOpenDialog"]);
    servoyApi =  jasmine.createSpyObj("ServoyApi", ["getMarkupId","trustAsHtml", "getFormname"]); 
    
    TestBed.configureTestingModule({
        declarations: [ ServoyDefaultImageMedia, UploadDirective],
        imports: [SabloModule, ServoyPublicModule],
        providers: [FormattingService,TooltipService, { provide: ApplicationService, useValue: applicationService}, ServoyService, I18NProvider, SvyUtilsService, {provide: ServoyApi, useValue: servoyApi}, ViewportService, FormService], 
      })
      .compileComponents();
    
    fixture = TestBed.createComponent(ServoyDefaultImageMedia);
    component = fixture.componentInstance;
    component.servoyApi = servoyApi as ServoyApi;
    component.enabled = true; 
    component.editable = true; 
    fixture.detectChanges();
  }); 

  it('should create', () => {
    expect(component).toBeTruthy();
  }); 

  it('should be the default image url', () => {
    expect(component.imageURL).toEqual('servoydefault/imagemedia/res/images/empty.gif');
  });

  it ('should delete the current uploaded file/image', () => {
    component.imageURL = "servoydefault/imagemedia/res/images/notemptymedia.gif"
    imgUpload = fixture.debugElement.queryAll(By.css('.imgdelete'));
    imgUpload[0].nativeElement.dispatchEvent(new Event('click'));
    fixture.detectChanges();
    expect(component.dataProviderID).toBeNull();
    expect(component.imageURL).toEqual('servoydefault/imagemedia/res/images/empty.gif');
  });

  it('should call the upload service', () => {
    imgUpload = fixture.debugElement.queryAll(By.css('.imgupload'));
    imgUpload[0].nativeElement.dispatchEvent(new Event('click'));
    fixture.detectChanges();
    expect(applicationService.showFileOpenDialog).toHaveBeenCalled();
  });
  
  it('should download file', () => {
      component.imageURL = "servoydefault/imagemedia/res/images/notemptymedia.gif";
      let spy = spyOn(component, "downloadMedia");
      imgUpload = fixture.debugElement.queryAll(By.css('.imgdownload'));
      imgUpload[0].nativeElement.dispatchEvent(new Event('click'));
      fixture.detectChanges();
      expect(spy).toHaveBeenCalled();
    });
});
