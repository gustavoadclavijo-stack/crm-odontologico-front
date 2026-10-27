import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotaClinicaComponent } from './nota-clinica';

describe('NotaClinicaComponent', () => {
  let component: NotaClinicaComponent;
  let fixture: ComponentFixture<NotaClinicaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotaClinicaComponent]
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

  it('should show a recording graphic and then a read-only voice result', () => {
    let recognition: FakeSpeechRecognition | undefined;
    class MockSpeechRecognition extends FakeSpeechRecognition {
      constructor() {
        super();
        recognition = this;
      }
    }

    Object.defineProperty(window, 'SpeechRecognition', {
      configurable: true,
      value: MockSpeechRecognition
    });

    fixture.detectChanges();
    component.iniciarDictado();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.voice-visualizer')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('textarea')).toBeNull();

    recognition?.onresult?.({
      resultIndex: 0,
      results: [{ isFinal: true, 0: { transcript: 'Sensibilidad dental' }, length: 1 }]
    });
    component.detenerDictado();
    recognition?.onend?.();
    fixture.detectChanges();

    const result = fixture.nativeElement.querySelector('#clinical-note-result') as HTMLTextAreaElement;
    expect(result.value).toBe('Sensibilidad dental');
    expect(result.readOnly).toBe(true);

    delete (window as Window & { SpeechRecognition?: unknown }).SpeechRecognition;
  });
});

class FakeSpeechRecognition {
  lang = '';
  continuous = false;
  interimResults = false;
  onresult: ((event: {
    resultIndex: number;
    results: ArrayLike<{ isFinal: boolean; 0: { transcript: string }; length: number }>;
  }) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;

  start(): void {}

  stop(): void {}
}
