import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { OdontogramaViewComponent } from './odontograma-view';
import { OdontogramaApiService } from '../services/odontograma-api.service';
import { OdontogramaUpdateResponse } from '../models/odontograma.models';

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

  it('should send VoiceCaptureRequest to backend and paint updated tooth states from OdontogramaUpdateResponse', () => {
    const apiService = TestBed.inject(OdontogramaApiService);
    const mockResponse: OdontogramaUpdateResponse = {
      odontogramaId: 'odont-001',
      dientes: [
        {
          numero: 16,
          nombreColoquial: 'Primer molar superior derecho',
          cuadrante: 1,
          grupoDental: 'POSTERIOR',
          estadoGeneral: { estado: 'Presente', colorHex: null },
          caras: {
            mesial: { etiquetaVisual: 'Mesial', estado: 'Caries', colorHex: '#EF4444' },
            distal: { etiquetaVisual: 'Distal', estado: 'Sano', colorHex: '#22C55E' },
            vestibular: { etiquetaVisual: 'Vestibular', estado: 'Sano', colorHex: '#22C55E' },
            palatino_lingual: { etiquetaVisual: 'Palatino', estado: 'Sano', colorHex: '#22C55E' },
            oclusal_incisal: { etiquetaVisual: 'Oclusal', estado: 'Restaurado', colorHex: '#3B82F6' }
          }
        }
      ]
    };

    const spy = vi.spyOn(apiService, 'procesarDictadoVoz').mockReturnValue(of(mockResponse));

    component.finalizarConsulta('Paciente con caries mesial y restauración oclusal en diente 16');
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith({
      odontogramaId: 'odont-001',
      textoCapturado: 'Paciente con caries mesial y restauración oclusal en diente 16'
    });

    const diente16 = component.dientes().find((d) => d.numero === 16);
    expect(diente16?.caras.mesial.estado).toBe('Caries');
    expect(diente16?.caras.oclusal_incisal.estado).toBe('Restaurado');
    expect(component.dienteSeleccionado()?.numero).toBe(16);
    expect(component.caraSeleccionada()).toBe('oclusal_incisal');

    const compiled = fixture.nativeElement as HTMLElement;
    const tooth16Button = compiled.querySelector('button[aria-label^="Seleccionar diente 16"]');
    expect(tooth16Button?.classList.contains('has-finding')).toBe(true);
    expect(compiled.querySelector('#detalle-pieza-titulo')?.textContent).toContain('Primer molar superior derecho (Diente 16)');
  });
});
