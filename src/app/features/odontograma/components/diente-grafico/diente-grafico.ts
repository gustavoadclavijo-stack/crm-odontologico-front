import { Component, computed, input, output } from '@angular/core';
import { CaraVisual, DienteData } from '../../models/odontograma.models';

type FormaDiente = 'incisivo' | 'canino' | 'premolar' | 'molar';

export interface IndicadorCara {
  id: string;
  etiqueta: string;
  estado: string;
  colorHex: string;
}

const COLORES_POR_ESTADO: Record<string, string> = {
  sano: '#22C55E',
  caries: '#EF4444',
  restaurado: '#3B82F6',
  fracturado: '#F97316',
  ausente: '#6B7280',
  'extraído': '#64748B',
  extraido: '#64748B',
  retenido: '#A855F7',
  corona: '#EAB308',
  implante: '#14B8A6',
  sellante: '#06B6D4'
};

@Component({
  selector: 'app-diente-grafico',
  standalone: true,
  templateUrl: './diente-grafico.html',
  styleUrl: './diente-grafico.scss'
})
export class DienteGraficoComponent {
  numeroDiente = input.required<number>();
  estado = input('Sano');
  diente = input<DienteData | null>(null);
  seleccionado = input(false);

  dienteClickeado = output<number>();

  readonly forma = computed<FormaDiente>(() => {
    const unidad = this.numeroDiente() % 10;
    if (unidad === 1 || unidad === 2) {
      return 'incisivo';
    }
    if (unidad === 3) {
      return 'canino';
    }
    if (unidad === 4 || unidad === 5) {
      return 'premolar';
    }
    return 'molar';
  });

  /**
   * Lista de caras que presentan algún hallazgo clínico distinto de Sano/Presente,
   * o indicador de pieza evaluada como Sana cuando fue diagnosticada explícitamente por el Backend.
   */
  readonly carasConHallazgo = computed<IndicadorCara[]>(() => {
    const data = this.diente();
    if (!data?.caras) {
      return [];
    }

    const orden: Array<[string, CaraVisual]> = [
      ['vestibular', data.caras.vestibular],
      ['oclusal_incisal', data.caras.oclusal_incisal],
      ['mesial', data.caras.mesial],
      ['distal', data.caras.distal],
      ['palatino_lingual', data.caras.palatino_lingual]
    ];

    const patologias = orden
      .filter(([, cara]) => cara && !this.esEstadoSanoOPresente(cara.estado))
      .map(([id, cara]) => ({
        id,
        etiqueta: cara.etiquetaVisual,
        estado: cara.estado,
        colorHex: this.resolverColorEstado(cara.estado, cara.colorHex)
      }));

    if (patologias.length > 0) {
      return patologias;
    }

    if (this.fueEvaluadoComoSano()) {
      return [
        {
          id: 'sano-evaluado',
          etiqueta: 'Diagnóstico',
          estado: 'Sano',
          colorHex: this.resolverColorEstado('Sano', data.estadoGeneral?.colorHex ?? '#22C55E')
        }
      ];
    }

    return [];
  });

  /**
   * Indica si el diente fue evaluado explícitamente como Sano por el Backend (posee color clínico #22C55E
   * en lugar del blanco neutro inicial #ffffff).
   */
  readonly fueEvaluadoComoSano = computed<boolean>(() => {
    const data = this.diente();
    if (!data) {
      return false;
    }
    if (this.tieneColorClinicoExplicito(data.estadoGeneral?.colorHex)) {
      return true;
    }
    if (!data.caras) {
      return false;
    }
    return Object.values(data.caras).some((cara) => this.tieneColorClinicoExplicito(cara?.colorHex));
  });

  /**
   * Determina si el diente tiene un hallazgo o diagnóstico evaluado a nivel general o en sus caras.
   */
  readonly tieneHallazgo = computed<boolean>(() => {
    const data = this.diente();
    const estadoGeneral = data?.estadoGeneral?.estado ?? this.estado();
    if (!this.esEstadoSanoOPresente(estadoGeneral)) {
      return true;
    }
    if (this.carasConHallazgo().length > 0) {
      return true;
    }
    return this.fueEvaluadoComoSano();
  });

  /**
   * Indica si el diente está ausente o extraído para aplicar estilo visual correspondiente.
   */
  readonly esAusenteOExtraido = computed<boolean>(() => {
    const data = this.diente();
    const estadoGeneral = (data?.estadoGeneral?.estado ?? this.estado()).trim().toLowerCase();
    return estadoGeneral === 'ausente' || estadoGeneral === 'extraído' || estadoGeneral === 'extraido';
  });

  /**
   * Estado descriptivo principal del diente para accesibilidad y visualización.
   */
  readonly etiquetaEstado = computed<string>(() => {
    const data = this.diente();
    const estadoGeneral = data?.estadoGeneral?.estado ?? this.estado();
    if (!this.esEstadoSanoOPresente(estadoGeneral)) {
      return estadoGeneral;
    }
    const hallazgos = this.carasConHallazgo();
    if (hallazgos.length > 0) {
      return hallazgos.map((h) => `${h.etiqueta}: ${h.estado}`).join(', ');
    }
    return 'Sano';
  });

  /**
   * Color hexadecimal principal que representa el estado del diente en la grilla.
   */
  readonly colorHallazgo = computed<string | null>(() => {
    const data = this.diente();
    const estadoGeneral = data?.estadoGeneral?.estado ?? this.estado();

    if (!this.esEstadoSanoOPresente(estadoGeneral)) {
      return this.resolverColorEstado(estadoGeneral, data?.estadoGeneral?.colorHex ?? null);
    }

    const hallazgos = this.carasConHallazgo();
    if (hallazgos.length > 0) {
      return hallazgos[0].colorHex;
    }

    if (this.fueEvaluadoComoSano()) {
      return this.resolverColorEstado('Sano', data?.estadoGeneral?.colorHex ?? '#22C55E');
    }

    return null;
  });

  onDienteClick(): void {
    this.dienteClickeado.emit(this.numeroDiente());
  }

  private esEstadoSanoOPresente(estado: string | null | undefined): boolean {
    if (!estado) return true;
    const norm = estado.trim().toLowerCase();
    return norm === 'sano' || norm === 'presente';
  }

  private tieneColorClinicoExplicito(colorHex: string | null | undefined): boolean {
    if (!colorHex) return false;
    const coloresNeutros = new Set(['#fff', '#ffffff', '#fffdf5', '#fffefa']);
    return !coloresNeutros.has(colorHex.trim().toLowerCase());
  }

  private resolverColorEstado(estado: string, colorHex: string | null): string {
    if (this.tieneColorClinicoExplicito(colorHex)) {
      return colorHex!;
    }
    return COLORES_POR_ESTADO[estado.trim().toLowerCase()] ?? '#F59E0B';
  }
}
