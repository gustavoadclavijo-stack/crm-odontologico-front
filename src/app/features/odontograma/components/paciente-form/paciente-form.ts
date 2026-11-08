import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, inject, model, signal } from '@angular/core';
import { SpeechTranscriptionService } from '../../services/speech-transcription.service';
import { OdontogramaApiService } from '../../services/odontograma-api.service';
import { crearPacienteVacio, DatosPaciente } from '../../models/paciente.models';

type CampoPaciente = keyof DatosPaciente;

@Component({
  selector: 'app-paciente-form',
  standalone: true,
  templateUrl: './paciente-form.html',
  styleUrl: './paciente-form.scss'
})
export class PacienteFormComponent implements OnDestroy {
  private readonly speechTranscription = inject(SpeechTranscriptionService);
  private readonly odontogramaApi = inject(OdontogramaApiService);

  readonly paciente = model<DatosPaciente>(crearPacienteVacio());
  protected readonly grabando = signal(false);
  protected readonly iniciandoGrabacion = signal(false);
  protected readonly transcribiendo = signal(false);
  protected readonly mensajeEstado = signal('');
  protected readonly transcripcion = signal('');

  protected readonly campos: ReadonlyArray<{ id: CampoPaciente; label: string; multiline?: boolean }> = [
    { id: 'nombres', label: 'Nombres' },
    { id: 'apellidos', label: 'Apellidos' },
    { id: 'identificacion', label: 'Documento de identidad' },
    { id: 'edad', label: 'Edad' },
    { id: 'genero', label: 'Género' },
    { id: 'telefono', label: 'Teléfono' },
    { id: 'correo', label: 'Correo electrónico' },
    { id: 'direccion', label: 'Dirección' },
    { id: 'ocupacion', label: 'Ocupación' },
    { id: 'aseguradora', label: 'Aseguradora / plan de salud' },
    { id: 'contactoEmergencia', label: 'Contacto de emergencia' },
    { id: 'alergias', label: 'Alergias', multiline: true },
    { id: 'medicamentos', label: 'Medicamentos actuales', multiline: true },
    { id: 'antecedentesMedicos', label: 'Antecedentes médicos', multiline: true },
    { id: 'antecedentesOdontologicos', label: 'Antecedentes odontológicos', multiline: true }
  ];

  private grabadora: MediaRecorder | null = null;
  private flujoMicrofono: MediaStream | null = null;
  private fragmentosAudio: Blob[] = [];
  private intentoCaptura = 0;

  protected actualizarCampo(campo: CampoPaciente, evento: Event): void {
    const valor = (evento.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.paciente.update((actual) => ({ ...actual, [campo]: valor }));
  }

  protected async iniciarDictado(): Promise<void> {
    this.cancelarCaptura();
    this.mensajeEstado.set('');
    this.transcripcion.set('');

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

  protected detenerDictado(): void {
    if (this.grabadora?.state === 'recording') this.grabadora.stop();
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
    this.speechTranscription.transcribir(audio).subscribe({
      next: (texto) => {
        if (intento !== this.intentoCaptura) return;
        this.transcripcion.set(texto);
        this.mensajeEstado.set('Organizando los datos mencionados en sus campos…');
        this.odontogramaApi.procesarDictadoPaciente(texto).subscribe({
          next: (datos) => {
            if (intento !== this.intentoCaptura) return;
            const datosMencionados = Object.fromEntries(
              Object.entries(datos).filter(([, valor]) => typeof valor === 'string' && valor.trim())
            ) as Partial<DatosPaciente>;
            this.paciente.update((actual) => ({ ...actual, ...datosMencionados }));
            const cantidad = Object.keys(datosMencionados).length;
            this.mensajeEstado.set(
              cantidad
                ? `Se organizaron ${cantidad} datos. Revisa y corrige los campos antes de continuar.`
                : 'No se identificaron datos para completar. Revisa la transcripción e inténtalo de nuevo.'
            );
            this.transcribiendo.set(false);
          },
          error: (error: unknown) => {
            if (intento !== this.intentoCaptura) return;
            this.transcribiendo.set(false);
            this.mensajeEstado.set(
              `${this.mensajeErrorExtraccion(error)} La transcripción completa queda disponible para copiar manualmente.`
            );
          }
        });
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

  private mensajeErrorExtraccion(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 200 && error.error instanceof SyntaxError) {
        return 'El servidor devolvió HTML en lugar del JSON del backend clínico. Verifica que /api/v1 esté dirigido al backend Java.';
      }
      const detail = error.error?.detail;
      if (typeof detail === 'string' && detail.trim()) return detail;
      const message = error.error?.message;
      if (typeof message === 'string' && message.trim()) return message;
      if (error.status === 0) {
        return 'No se pudo conectar con el backend clínico en http://localhost:8080.';
      }
    }
    return 'No fue posible organizar los datos del paciente. Inténtalo de nuevo.';
  }
}
