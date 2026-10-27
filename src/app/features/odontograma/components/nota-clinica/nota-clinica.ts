import { Component, OnDestroy, input, output, signal } from '@angular/core';

interface SpeechRecognitionAlternative {
  transcript: string;
}

interface SpeechRecognitionResult extends ArrayLike<SpeechRecognitionAlternative> {
  isFinal: boolean;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResult>;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionWindow extends Window {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
}

@Component({
  selector: 'app-nota-clinica',
  standalone: true,
  templateUrl: './nota-clinica.html',
  styleUrl: './nota-clinica.scss'
})
export class NotaClinicaComponent implements OnDestroy {
  readonly finalizada = input(false);
  readonly notaCambiada = output<string>();
  readonly finalizar = output<string>();

  protected readonly texto = signal('');
  protected readonly grabando = signal(false);
  protected readonly mensajeEstado = signal('');
  protected readonly modoEntrada = signal<'escritura' | 'voz' | null>(null);

  private reconocimiento: SpeechRecognitionLike | null = null;
  private textoReconocido = '';

  onNotaInput(evento: Event): void {
    const nota = (evento.target as HTMLTextAreaElement).value;
    this.texto.set(nota);
    this.notaCambiada.emit(nota);
  }

  seleccionarEscritura(): void {
    this.detenerReconocimiento();
    this.modoEntrada.set('escritura');
    this.textoReconocido = '';
    this.texto.set('');
    this.mensajeEstado.set('');
    this.notaCambiada.emit('');
  }

  iniciarDictado(): void {
    this.detenerReconocimiento();
    this.modoEntrada.set('voz');
    this.textoReconocido = '';
    this.texto.set('');
    this.mensajeEstado.set('');
    this.notaCambiada.emit('');

    const speechWindow = window as SpeechRecognitionWindow;
    const SpeechRecognitionConstructor =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      this.mensajeEstado.set('El dictado por voz no está disponible en este navegador.');
      return;
    }

    const reconocimiento = new SpeechRecognitionConstructor();
    reconocimiento.lang = 'es-CO';
    reconocimiento.continuous = true;
    reconocimiento.interimResults = false;
    reconocimiento.onresult = (evento) => {
      const texto = Array.from(evento.results)
        .slice(evento.resultIndex)
        .filter((resultado) => resultado.isFinal)
        .map((resultado) => resultado[0]?.transcript.trim() ?? '')
        .filter(Boolean)
        .join(' ');

      if (texto) {
        this.textoReconocido = `${this.textoReconocido} ${texto}`.trim();
      }
    };
    reconocimiento.onerror = (evento) => {
      this.grabando.set(false);
      this.mensajeEstado.set(this.mensajeErrorVoz(evento.error));
    };
    reconocimiento.onend = () => {
      this.grabando.set(false);
      this.reconocimiento = null;
      this.texto.set(this.textoReconocido);
      this.notaCambiada.emit(this.textoReconocido);
    };

    this.reconocimiento = reconocimiento;
    this.mensajeEstado.set('');
    this.grabando.set(true);

    try {
      reconocimiento.start();
    } catch (error) {
      this.grabando.set(false);
      this.reconocimiento = null;
      this.mensajeEstado.set(this.mensajeErrorInicio(error));
    }
  }

  detenerDictado(): void {
    this.reconocimiento?.stop();
  }

  finalizarNota(): void {
    this.detenerReconocimiento();
    this.finalizar.emit(this.texto());
  }

  ngOnDestroy(): void {
    this.detenerReconocimiento();
  }

  private detenerReconocimiento(): void {
    if (!this.reconocimiento) return;

    this.reconocimiento.onend = null;
    this.reconocimiento.onerror = null;
    this.reconocimiento.stop();
    this.reconocimiento = null;
    this.grabando.set(false);
  }

  private mensajeErrorVoz(error: string): string {
    if (error === 'not-allowed' || error === 'service-not-allowed') {
      return 'No se concedió permiso para usar el micrófono.';
    }
    if (error === 'no-speech') {
      return 'No se detectó voz. Puedes volver a intentarlo.';
    }
    if (error === 'audio-capture') {
      return 'No se encontró un micrófono disponible.';
    }
    if (error === 'network') {
      return 'El servicio de reconocimiento no está disponible. Revisa tu conexión.';
    }
    if (error === 'language-not-supported') {
      return 'El navegador no admite reconocimiento de voz en español de Colombia.';
    }
    if (error === 'aborted') {
      return 'El dictado se detuvo antes de completar el reconocimiento.';
    }
    return 'No fue posible completar el dictado. Inténtalo de nuevo.';
  }

  private mensajeErrorInicio(error: unknown): string {
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
        return 'No se concedió permiso para usar el micrófono. Verifica también que estés en una conexión segura (HTTPS o localhost).';
      }
      if (error.name === 'InvalidStateError') {
        return 'El reconocimiento de voz ya está en curso. Detén el dictado e inténtalo de nuevo.';
      }
      if (error.name === 'NotSupportedError') {
        return 'Este navegador no admite el reconocimiento de voz requerido.';
      }
    }
    return 'No se pudo iniciar el dictado. Verifica el permiso del micrófono e inténtalo de nuevo.';
  }
}
