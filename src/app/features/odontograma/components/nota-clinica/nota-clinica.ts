import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, inject, input, output, signal } from '@angular/core';
import { SpeechTranscriptionService } from '../../services/speech-transcription.service';

@Component({
  selector: 'app-nota-clinica',
  standalone: true,
  templateUrl: './nota-clinica.html',
  styleUrl: './nota-clinica.scss'
})
export class NotaClinicaComponent implements OnDestroy {
  private readonly speechTranscription = inject(SpeechTranscriptionService);

  readonly finalizada = input(false);
  readonly procesando = input(false);
  readonly errorServidor = input<string | null>(null);
  readonly resumenActualizacion = input<string | null>(null);

  readonly notaCambiada = output<string>();
  readonly finalizar = output<string>();

  protected readonly texto = signal('');
  protected readonly grabando = signal(false);
  protected readonly iniciandoGrabacion = signal(false);
  protected readonly transcribiendo = signal(false);
  protected readonly mensajeEstado = signal('');
  protected readonly modoEntrada = signal<'escritura' | 'voz' | null>(null);

  private grabadora: MediaRecorder | null = null;
  private flujoMicrofono: MediaStream | null = null;
  private fragmentosAudio: Blob[] = [];
  private intentoCaptura = 0;

  onNotaInput(evento: Event): void {
    const nota = (evento.target as HTMLTextAreaElement).value;
    this.texto.set(nota);
    this.notaCambiada.emit(nota);
  }

  seleccionarEscritura(): void {
    this.cancelarCaptura();
    this.modoEntrada.set('escritura');
    this.texto.set('');
    this.mensajeEstado.set('');
    this.notaCambiada.emit('');
  }

  async iniciarDictado(): Promise<void> {
    this.cancelarCaptura();
    this.modoEntrada.set('voz');
    this.texto.set('');
    this.mensajeEstado.set('');
    this.notaCambiada.emit('');

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      this.mensajeEstado.set('El dictado por voz no está disponible en este navegador.');
      return;
    }

    const intento = this.intentoCaptura;
    this.iniciandoGrabacion.set(true);

    try {
      const flujo = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (intento !== this.intentoCaptura) {
        flujo.getTracks().forEach((pista) => pista.stop());
        return;
      }

      this.flujoMicrofono = flujo;
      const mimeType = this.tipoAudioCompatible();
      const grabadora = new MediaRecorder(flujo, mimeType ? { mimeType } : undefined);
      this.grabadora = grabadora;
      this.fragmentosAudio = [];

      grabadora.ondataavailable = (evento) => {
        if (evento.data.size > 0) this.fragmentosAudio.push(evento.data);
      };
      grabadora.onerror = () => {
        grabadora.onstop = null;
        this.mensajeEstado.set('Ocurrió un error al grabar el audio. Inténtalo de nuevo.');
        this.liberarMicrofono();
        this.grabando.set(false);
      };
      grabadora.onstop = () => {
        const audio = new Blob(this.fragmentosAudio, {
          type: grabadora.mimeType || 'audio/webm'
        });
        this.fragmentosAudio = [];
        this.liberarMicrofono();
        this.grabando.set(false);
        this.transcribirAudio(audio, intento);
      };

      grabadora.start();
      this.iniciandoGrabacion.set(false);
      this.grabando.set(true);
    } catch (error) {
      if (intento !== this.intentoCaptura) return;
      this.liberarMicrofono();
      this.iniciandoGrabacion.set(false);
      this.grabando.set(false);
      this.mensajeEstado.set(this.mensajeErrorInicio(error));
    }
  }

  detenerDictado(): void {
    if (this.grabadora?.state === 'recording') {
      this.grabadora.stop();
    }
  }

  finalizarNota(): void {
    this.cancelarCaptura();
    this.finalizar.emit(this.texto());
  }

  ngOnDestroy(): void {
    this.cancelarCaptura();
  }

  private cancelarCaptura(): void {
    this.intentoCaptura++;
    if (this.grabadora && this.grabadora.state !== 'inactive') {
      this.grabadora.onstop = null;
      this.grabadora.stop();
    }
    this.liberarMicrofono();
    this.grabadora = null;
    this.fragmentosAudio = [];
    this.grabando.set(false);
    this.iniciandoGrabacion.set(false);
    this.transcribiendo.set(false);
  }

  private liberarMicrofono(): void {
    this.flujoMicrofono?.getTracks().forEach((pista) => pista.stop());
    this.flujoMicrofono = null;
    this.grabadora = null;
  }

  private tipoAudioCompatible(): string | null {
    const formatos = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'];
    return formatos.find((formato) => MediaRecorder.isTypeSupported(formato)) ?? null;
  }

  private transcribirAudio(audio: Blob, intento: number): void {
    if (intento !== this.intentoCaptura) return;
    if (!audio.size) {
      this.mensajeEstado.set('No se capturó audio. Puedes volver a intentarlo.');
      return;
    }

    this.transcribiendo.set(true);
    this.mensajeEstado.set('');
    this.speechTranscription.transcribir(audio).subscribe({
      next: (texto) => {
        if (intento !== this.intentoCaptura) return;
        this.texto.set(texto);
        this.notaCambiada.emit(texto);
        this.transcribiendo.set(false);
      },
      error: (error: unknown) => {
        if (intento !== this.intentoCaptura) return;
        this.transcribiendo.set(false);
        this.mensajeEstado.set(this.mensajeErrorTranscripcion(error));
      }
    });
  }

  private mensajeErrorInicio(error: unknown): string {
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
        return 'No se concedió permiso para usar el micrófono. Verifica también que estés en una conexión segura (HTTPS o localhost).';
      }
      if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        return 'No se encontró un micrófono disponible.';
      }
    }
    return 'No se pudo iniciar el dictado. Verifica el permiso del micrófono e inténtalo de nuevo.';
  }

  private mensajeErrorTranscripcion(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const mensaje = error.error?.message;
      if (typeof mensaje === 'string' && mensaje.trim()) return mensaje;
      if (error.status === 0) {
        return 'No se pudo conectar con el servicio de transcripción. Revisa tu conexión.';
      }
      if (error.status === 413) {
        return 'El audio supera el límite de tamaño permitido. Graba un dictado más corto.';
      }
    }
    return 'No fue posible transcribir el audio. Inténtalo de nuevo.';
  }
}
