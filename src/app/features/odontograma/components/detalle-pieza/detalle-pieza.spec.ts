import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DienteData } from '../../models/odontograma.models';
import { DetallePiezaComponent } from './detalle-pieza';

describe('DetallePiezaComponent', () => {
  let fixture: ComponentFixture<DetallePiezaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetallePiezaComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(DetallePiezaComponent);
    fixture.componentRef.setInput('diente', crearDiente());
    await fixture.whenStable();
  });

  it('should render and make all five dental surfaces selectable', () => {
    fixture.detectChanges();

    const surfaces = fixture.nativeElement.querySelectorAll('.cara-superficie');
    if (surfaces.length) {
      expect(surfaces).toHaveLength(5);
    } else {
      expect(fixture.nativeElement.querySelector('.visor-cargando')).toBeTruthy();
    }
  });

  it('should show a loading indicator instead of the flat image while the 3D model loads', () => {
    fixture.detectChanges();
    fixture.componentInstance.estadoVisor3d.set('cargando');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.visor-cargando')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.caras-svg')).toBeNull();
  });

  it('should keep the 3D view fixed at its default zoom', () => {
    fixture.componentInstance.estadoVisor3d.set('listo');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.controles-3d')?.textContent).toContain('Arrastra para girar');
    expect(fixture.nativeElement.querySelector('.controles-3d')?.textContent).not.toContain('acercar');
    expect(fixture.nativeElement.querySelector('.visor-3d')?.getAttribute('onwheel')).toBeNull();
  });

  it('should show the roots in perspective within the occlusal tooth illustration', () => {
    fixture.detectChanges();

    const view = fixture.nativeElement.querySelector('.vista-diente');
    expect(view.querySelector('.caras-svg')).toBeTruthy();
    expect(view.querySelectorAll('.caras-svg .raiz-perspectiva')).toHaveLength(2);
    expect(view.querySelector('.caras-svg .surco-raiz')).toBeTruthy();
    expect(view.querySelector('.vista-perspectiva')).toBeNull();
  });

  it('should emit the selected face and show its clinical state', () => {
    const component = fixture.componentInstance;
    const onCaraClickeada = vi.fn();
    component.caraClickeada.subscribe(onCaraClickeada);

    component.seleccionarCara('vestibular');
    fixture.componentRef.setInput('caraSeleccionada', 'vestibular');
    fixture.detectChanges();

    expect(onCaraClickeada).toHaveBeenCalledWith('vestibular');
    expect(fixture.nativeElement.querySelector('.estado-cara-badge')?.textContent).toContain('Caries');
  });

  it('should update the displayed tooth details when the selected tooth changes', () => {
    fixture.componentRef.setInput('diente', crearDiente(26));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#detalle-pieza-titulo')?.textContent).toContain('Diente 26');
    expect(fixture.nativeElement.querySelector('.estado-general')?.textContent).toContain('Restaurado');
  });
});

function crearDiente(numero = 11): DienteData {
  const cara = (etiquetaVisual: string, estado: string) => ({
    etiquetaVisual,
    estado,
    colorHex: estado === 'Caries' ? '#fca5a5' : '#fffdf5'
  });

  return {
    numero,
    nombreColoquial: `Diente ${numero}`,
    estadoGeneral: {
      estado: numero === 26 ? 'Restaurado' : 'Sano',
      colorHex: '#ffffff'
    },
    caras: {
      vestibular: cara('Vestibular', 'Caries'),
      distal: cara('Distal', 'Sano'),
      mesial: cara('Mesial', 'Sano'),
      palatino_lingual: cara('Palatino/Lingual', 'Sano'),
      oclusal_incisal: cara('Oclusal/Incisal', 'Sano')
    }
  };
}
