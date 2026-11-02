import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { OdontogramaGridComponent } from '../components/odontograma-grid/odontograma-grid';
import { DetallePiezaComponent, CaraDienteId } from '../components/detalle-pieza/detalle-pieza';
import { NotaClinicaComponent } from '../components/nota-clinica/nota-clinica';
import {
  CarasDiente,
  DienteData,
  OdontogramaUpdateResponse
} from '../models/odontograma.models';
import { OdontogramaApiService } from '../services/odontograma-api.service';

@Component({
  selector: 'app-odontograma-view',
  standalone: true,
  imports: [OdontogramaGridComponent, DetallePiezaComponent, NotaClinicaComponent],
  templateUrl: './odontograma-view.html',
  styleUrl: './odontograma-view.scss'
})
export class OdontogramaViewComponent {
  private readonly odontogramaApi = inject(OdontogramaApiService);

  readonly odontogramaId = signal('odont-001');
  readonly dientes = signal<DienteData[]>(this.generarBocaCompleta());
  readonly numeroSeleccionado = signal<number | null>(null);
  readonly dienteSeleccionado = computed<DienteData | null>(() => {
    const numero = this.numeroSeleccionado();
    if (numero === null) {
      return null;
    }
    return this.dientes().find((pieza) => pieza.numero === numero) ?? null;
  });
  readonly caraSeleccionada = signal<CaraDienteId | null>(null);
  readonly notaClinica = signal('');
  readonly consultaFinalizada = signal(false);
  readonly procesandoDictado = signal(false);
  readonly errorDictado = signal<string | null>(null);
  readonly resumenActualizacion = signal<string | null>(null);

  onDienteSeleccionado(numero: number): void {
    this.numeroSeleccionado.set(numero);
    this.caraSeleccionada.set(null);
    this.consultaFinalizada.set(false);
  }

  onCaraSeleccionada(cara: CaraDienteId): void {
    this.caraSeleccionada.set(cara);
    this.consultaFinalizada.set(false);
  }

  onNotaCambiada(nota: string): void {
    this.notaClinica.set(nota);
    this.consultaFinalizada.set(false);
    this.errorDictado.set(null);
  }

  finalizarConsulta(nota: string): void {
    const textoLimpio = nota.trim();
    this.notaClinica.set(textoLimpio);
    this.errorDictado.set(null);

    if (!textoLimpio) {
      this.errorDictado.set('Por favor ingresa o dicta una descripción clínica antes de procesar.');
      this.consultaFinalizada.set(false);
      return;
    }

    this.procesandoDictado.set(true);
    this.consultaFinalizada.set(false);

    this.odontogramaApi
      .procesarDictadoVoz({
        odontogramaId: this.odontogramaId(),
        textoCapturado: textoLimpio
      })
      .subscribe({
        next: (response) => {
          this.procesandoDictado.set(false);
          this.aplicarRespuestaBackend(response);
          this.consultaFinalizada.set(true);
        },
        error: (err: unknown) => {
          this.procesandoDictado.set(false);
          this.consultaFinalizada.set(false);
          this.errorDictado.set(this.extraerMensajeError(err));
        }
      });
  }

  /**
   * Fusiona los dientes actualizados provenientes del Backend sobre las 32 piezas del odontograma
   * y enfoca automáticamente el primer diente y superficie con hallazgos.
   */
  aplicarRespuestaBackend(response: OdontogramaUpdateResponse): void {
    if (response.odontogramaId) {
      this.odontogramaId.set(response.odontogramaId);
    }

    const dientesRecibidos = response.dientes?.length
      ? response.dientes
      : response.diente
        ? [response.diente]
        : [];

    if (dientesRecibidos.length === 0) {
      return;
    }

    const mapaActualizados = new Map<number, DienteData>(
      dientesRecibidos.map((diente) => [diente.numero, diente])
    );

    this.dientes.update((actuales) =>
      actuales.map((pieza) => mapaActualizados.get(pieza.numero) ?? pieza)
    );

    const primerDiente = dientesRecibidos[0];
    this.numeroSeleccionado.set(primerDiente.numero);
    this.caraSeleccionada.set(this.primeraCaraConHallazgo(primerDiente));

    const numerosModificados = dientesRecibidos.map((d) => d.numero).join(', ');
    this.resumenActualizacion.set(
      `Odontograma actualizado (${dientesRecibidos.length} ${
        dientesRecibidos.length === 1 ? 'pieza modificada' : 'piezas modificadas'
      }: ${numerosModificados}).`
    );
  }

  private primeraCaraConHallazgo(diente: DienteData): CaraDienteId | null {
    const orden: CaraDienteId[] = [
      'oclusal_incisal',
      'vestibular',
      'mesial',
      'distal',
      'palatino_lingual'
    ];
    for (const id of orden) {
      const estado = diente.caras[id]?.estado?.trim().toLowerCase();
      if (estado && estado !== 'sano' && estado !== 'presente') {
        return id;
      }
    }
    return null;
  }

  private extraerMensajeError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const backendBody = err.error;
      if (backendBody && typeof backendBody === 'object') {
        if (typeof backendBody.message === 'string' && backendBody.message.trim()) {
          return backendBody.message;
        }
        if (typeof backendBody.detail === 'string' && backendBody.detail.trim()) {
          return backendBody.detail;
        }
      }
      if (err.status === 0) {
        return 'No se pudo conectar con el backend en http://localhost:8080. Verifica que el servidor Java esté en ejecución.';
      }
    }
    return 'No fue posible procesar el dictado clínico en el servidor. Inténtalo de nuevo.';
  }

  private generarBocaCompleta(): DienteData[] {
    const numeros = [
      ...Array.from({ length: 8 }, (_, index) => 18 - index),
      ...Array.from({ length: 8 }, (_, index) => 21 + index),
      ...Array.from({ length: 8 }, (_, index) => 31 + index),
      ...Array.from({ length: 8 }, (_, index) => 41 + index)
    ];

    return numeros.map((numero) => this.crearDienteVacio(numero));
  }

  private crearDienteVacio(numero: number): DienteData {
    const esSuperior = numero < 30;
    const posicion = numero % 10;
    const esAnterior = posicion >= 1 && posicion <= 3;

    const caraSana = (etiquetaVisual: string) => ({
      colorHex: '#ffffff',
      etiquetaVisual,
      estado: 'Sano' as const
    });

    const caras: CarasDiente = {
      vestibular: caraSana('Vestibular'),
      palatino_lingual: caraSana(esSuperior ? 'Palatino' : 'Lingual'),
      mesial: caraSana('Mesial'),
      distal: caraSana('Distal'),
      oclusal_incisal: caraSana(esAnterior ? 'Incisal' : 'Oclusal')
    };

    return {
      numero,
      nombreColoquial: `Diente ${numero}`,
      cuadrante: Math.floor(numero / 10),
      grupoDental: esAnterior ? 'ANTERIOR' : 'POSTERIOR',
      estadoGeneral: { estado: 'Sano', colorHex: '#ffffff' },
      caras
    };
  }
}
