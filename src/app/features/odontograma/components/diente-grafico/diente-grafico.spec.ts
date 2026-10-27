import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DienteGraficoComponent } from './diente-grafico';

describe('DienteGraficoComponent', () => {
  let component: DienteGraficoComponent;
  let fixture: ComponentFixture<DienteGraficoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DienteGraficoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DienteGraficoComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('numeroDiente', 11);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render a tooth silhouette without interactive surface zones', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.corona')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[role="button"]')).toBeNull();
  });
});
