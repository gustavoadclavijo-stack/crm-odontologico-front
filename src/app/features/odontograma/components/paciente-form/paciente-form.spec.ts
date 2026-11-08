import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { OdontogramaApiService } from '../../services/odontograma-api.service';
import { SpeechTranscriptionService } from '../../services/speech-transcription.service';
import { PacienteFormComponent } from './paciente-form';

describe('PacienteFormComponent', () => {
  let fixture: ComponentFixture<PacienteFormComponent>;
  let component: PacienteFormComponent;
  let transcription: {
    transcribir: ReturnType<typeof vi.fn>;
  };
  let patientApi: { procesarDictadoPaciente: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    transcription = {
      transcribir: vi.fn(() =>
        of('María López tiene 34 años y es alérgica a la penicilina.')
      )
    };
    patientApi = {
      procesarDictadoPaciente: vi.fn(() =>
        of({
          nombres: 'María',
          apellidos: 'López',
          identificacion: '',
          edad: '34',
          genero: '',
          telefono: '',
          correo: '',
          direccion: '',
          ocupacion: '',
          aseguradora: '',
          contactoEmergencia: '',
          alergias: 'Penicilina',
          medicamentos: '',
          antecedentesMedicos: '',
          antecedentesOdontologicos: ''
        })
      )
    };
    await TestBed.configureTestingModule({
      imports: [PacienteFormComponent],
      providers: [
        { provide: SpeechTranscriptionService, useValue: transcription },
        { provide: OdontogramaApiService, useValue: patientApi }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PacienteFormComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should render patient details and update the patient model on input', () => {
    fixture.detectChanges();

    const names = fixture.nativeElement.querySelector('#patient-nombres') as HTMLInputElement;
    names.value = 'María José';
    names.dispatchEvent(new Event('input'));

    expect(component.paciente().nombres).toBe('María José');
    expect(fixture.nativeElement.textContent).toContain('Antecedentes odontológicos');
  });

  it('should transcribe all patient details and distribute them into the matching fields', async () => {
    const stopTrack = vi.fn();
    const stream = { getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue(stream) }
    });

    class MockMediaRecorder extends FakeMediaRecorder {}
    Object.defineProperty(window, 'MediaRecorder', {
      configurable: true,
      value: MockMediaRecorder
    });

    fixture.detectChanges();
    component.paciente.update((patient) => ({ ...patient, telefono: '3001234567' }));
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
    const startButton = [...buttons].find((button) =>
      button.textContent?.includes('Dictar información del paciente')
    );
    if (!startButton) throw new Error('Voice dictation button was not rendered');
    startButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    const stopButton = [...fixture.nativeElement.querySelectorAll('button')].find(
      (button: HTMLButtonElement) => button.textContent?.includes('Detener grabación')
    );
    if (!stopButton) throw new Error('Stop dictation button was not rendered');
    stopButton.click();
    fixture.detectChanges();

    const names = fixture.nativeElement.querySelector('#patient-nombres') as HTMLInputElement;
    const surname = fixture.nativeElement.querySelector('#patient-apellidos') as HTMLInputElement;
    const age = fixture.nativeElement.querySelector('#patient-edad') as HTMLInputElement;
    const phone = fixture.nativeElement.querySelector('#patient-telefono') as HTMLInputElement;
    const allergies = fixture.nativeElement.querySelector('#patient-alergias') as HTMLTextAreaElement;
    expect(names.value).toBe('María');
    expect(surname.value).toBe('López');
    expect(age.value).toBe('34');
    expect(phone.value).toBe('3001234567');
    expect(allergies.value).toBe('Penicilina');
    expect(transcription.transcribir).toHaveBeenCalledWith(expect.any(Blob));
    expect(patientApi.procesarDictadoPaciente).toHaveBeenCalledWith(
      'María López tiene 34 años y es alérgica a la penicilina.'
    );
    expect(fixture.nativeElement.querySelector('#patient-transcript')?.value).toContain('María López');
    expect(stopTrack).toHaveBeenCalled();

    Reflect.deleteProperty(window, 'MediaRecorder');
    Reflect.deleteProperty(navigator, 'mediaDevices');
  });
});

class FakeMediaRecorder {
  static isTypeSupported(): boolean {
    return true;
  }

  state: RecordingState = 'inactive';
  mimeType = 'audio/webm;codecs=opus';
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onstop: ((event: Event) => void) | null = null;

  constructor(
    _stream: MediaStream,
    _options?: MediaRecorderOptions
  ) {}

  start(): void {
    this.state = 'recording';
  }

  stop(): void {
    this.state = 'inactive';
    this.ondataavailable?.({
      data: new Blob(['patient detail audio'], { type: 'audio/webm' })
    } as BlobEvent);
    this.onstop?.(new Event('stop'));
  }
}
