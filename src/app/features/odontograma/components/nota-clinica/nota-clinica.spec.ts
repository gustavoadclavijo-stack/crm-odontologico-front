import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NotaClinicaComponent } from './nota-clinica';
import { SpeechTranscriptionService } from '../../services/speech-transcription.service';

describe('NotaClinicaComponent', () => {
  let component: NotaClinicaComponent;
  let fixture: ComponentFixture<NotaClinicaComponent>;
  let transcription: { transcribir: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    transcription = { transcribir: vi.fn(() => of('Sensibilidad dental en pieza 16')) };
    await TestBed.configureTestingModule({
      imports: [NotaClinicaComponent],
      providers: [{ provide: SpeechTranscriptionService, useValue: transcription }]
    }).compileComponents();

    fixture = TestBed.createComponent(NotaClinicaComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should show input mode choices before displaying a text field', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('textarea')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Escribir dictado');
    expect(fixture.nativeElement.textContent).toContain('Realizar dictado de voz');
  });

  it('should emit text entered in writing mode', () => {
    fixture.detectChanges();
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
    const writeButton = [...buttons].find((button) => button.textContent.includes('Escribir dictado'));
    if (!writeButton) throw new Error('Writing mode button was not rendered');
    writeButton.click();
    fixture.detectChanges();

    const onNotaCambiada = vi.fn();
    component.notaCambiada.subscribe(onNotaCambiada);
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;

    textarea.value = 'Paciente presenta sensibilidad';
    textarea.dispatchEvent(new Event('input'));

    expect(onNotaCambiada).toHaveBeenCalledWith('Paciente presenta sensibilidad');
  });

  it('should clear the previous text when changing input modes', () => {
    fixture.detectChanges();
    component.seleccionarEscritura();
    component.onNotaInput({ target: { value: 'Nota escrita' } } as unknown as Event);
    const onNotaCambiada = vi.fn();
    component.notaCambiada.subscribe(onNotaCambiada);

    component.iniciarDictado();

    expect(onNotaCambiada).toHaveBeenLastCalledWith('');
  });

  it('should emit the complete note when the consultation is finalized', () => {
    fixture.detectChanges();
    component.seleccionarEscritura();
    component.onNotaInput({ target: { value: 'Dolor en pieza 16' } } as unknown as Event);
    const onFinalizar = vi.fn();
    component.finalizar.subscribe(onFinalizar);

    component.finalizarNota();

    expect(onFinalizar).toHaveBeenCalledWith('Dolor en pieza 16');
  });

  it('should transcribe the complete recording and show its read-only result', async () => {
    const stopTrack = vi.fn();
    const stream = { getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue(stream) }
    });

    let recorder: FakeMediaRecorder | undefined;
    class MockMediaRecorder extends FakeMediaRecorder {
      constructor(stream: MediaStream, options?: MediaRecorderOptions) {
        super(stream, options);
        recorder = this;
      }
    }
    Object.defineProperty(window, 'MediaRecorder', {
      configurable: true,
      value: MockMediaRecorder
    });

    fixture.detectChanges();
    await component.iniciarDictado();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.voice-visualizer')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('textarea')).toBeNull();

    component.detenerDictado();
    fixture.detectChanges();

    const result = fixture.nativeElement.querySelector('#clinical-note-result') as HTMLTextAreaElement;
    expect(result.value).toBe('Sensibilidad dental en pieza 16');
    expect(result.readOnly).toBe(true);
    expect(recorder?.start).toHaveBeenCalled();
    expect(transcription.transcribir).toHaveBeenCalledWith(expect.any(Blob));
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

  start = vi.fn(() => {
    this.state = 'recording';
  });

  stop(): void {
    this.state = 'inactive';
    this.ondataavailable?.({
      data: new Blob(['complete recorded audio'], { type: 'audio/webm' })
    } as BlobEvent);
    this.onstop?.(new Event('stop'));
  }
}
