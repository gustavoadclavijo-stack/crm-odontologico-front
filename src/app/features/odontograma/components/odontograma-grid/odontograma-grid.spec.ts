import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OdontogramaGridComponent } from './odontograma-grid';
import { DienteData } from '../../models/odontograma.models';

describe('OdontogramaGridComponent', () => {
  let component: OdontogramaGridComponent;
  let fixture: ComponentFixture<OdontogramaGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OdontogramaGridComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OdontogramaGridComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('dientes', []);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should label the upper and lower arches and show a subtle center separator', () => {
    fixture.detectChanges();

    const labelElements: NodeListOf<HTMLElement> =
      fixture.nativeElement.querySelectorAll('.arcada-label');
    const labels = [...labelElements].map((label) => label.getAttribute('aria-label'));

    expect(labels).toEqual(['Maxilar superior', 'Mandíbula inferior']);
    expect(fixture.nativeElement.querySelector('.separador-central')).toBeTruthy();
  });

  it('should order the upper right quadrant from 18 to 11', () => {
    fixture.componentRef.setInput('dientes', Array.from({ length: 8 }, (_, index) =>
      crearDiente(11 + index)
    ));

    expect(component.cuadranteSupDer().map((diente) => diente.numero))
      .toEqual([18, 17, 16, 15, 14, 13, 12, 11]);
  });
});

function crearDiente(numero: number): DienteData {
  const cara = { etiquetaVisual: '', estado: 'Sano', colorHex: null };
  return {
    numero,
    nombreColoquial: '',
    estadoGeneral: { estado: 'Sano', colorHex: null },
    caras: {
      mesial: cara,
      distal: cara,
      vestibular: cara,
      palatino_lingual: cara,
      oclusal_incisal: cara
    }
  };
}
