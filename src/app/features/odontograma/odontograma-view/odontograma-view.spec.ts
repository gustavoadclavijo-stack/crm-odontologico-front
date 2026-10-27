import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OdontogramaViewComponent } from './odontograma-view';

describe('OdontogramaViewComponent', () => {
  let component: OdontogramaViewComponent;
  let fixture: ComponentFixture<OdontogramaViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OdontogramaViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OdontogramaViewComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render compact left navigation and a separate clinical note rail', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.sidebar nav[aria-label="Navegación principal"]')).toBeTruthy();
    expect(compiled.querySelector('.workspace-grid #odontograma')).toBeTruthy();
    expect(compiled.querySelector('.note-rail app-nota-clinica')).toBeTruthy();
  });

  it('should render 32 teeth and show the interactive detail when a tooth is selected', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelectorAll('.diente-container')).toHaveLength(32);
    expect(compiled.querySelectorAll('.caras-svg')).toHaveLength(0);

    const tooth = compiled.querySelector('button[aria-label^="Seleccionar diente 11"]');
    expect(tooth).toBeTruthy();
    tooth?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(compiled.querySelector('#detalle-pieza-titulo')?.textContent).toContain('Diente 11');
    expect(compiled.querySelectorAll('.cara-superficie')).toHaveLength(5);
  });
});
