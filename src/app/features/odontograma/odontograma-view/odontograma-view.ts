import { Component, signal } from '@angular/core';
import { OdontogramaGridComponent } from '../components/odontograma-grid/odontograma-grid';
import { DetallePiezaComponent, CaraDienteId } from '../components/detalle-pieza/detalle-pieza';
import { NotaClinicaComponent } from '../components/nota-clinica/nota-clinica';
import { CarasDiente, DienteData } from '../models/odontograma.models';

@Component({
  selector: 'app-odontograma-view',
  standalone: true,
  imports: [OdontogramaGridComponent, DetallePiezaComponent, NotaClinicaComponent],
  templateUrl: './odontograma-view.html',
  styleUrl: './odontograma-view.scss'
})
export class OdontogramaViewComponent {
  readonly dientes = signal<DienteData[]>(this.generarBocaCompleta());
  readonly dienteSeleccionado = signal<DienteData | null>(null);
  readonly caraSeleccionada = signal<CaraDienteId | null>(null);
  readonly notaClinica = signal('');
  readonly consultaFinalizada = signal(false);

  onDienteSeleccionado(numero: number): void {
    const diente = this.dientes().find((pieza) => pieza.numero === numero) ?? null;
    this.dienteSeleccionado.set(diente);
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
  }

  finalizarConsulta(nota: string): void {
    this.notaClinica.set(nota);
    this.consultaFinalizada.set(true);
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
    const caraSana = (etiquetaVisual: string) => ({
      colorHex: '#ffffff',
      etiquetaVisual,
      estado: 'Sano' as const
    });

    const caras: CarasDiente = {
      vestibular: caraSana('Vestibular'),
      palatino_lingual: caraSana('Palatino/Lingual'),
      mesial: caraSana('Mesial'),
      distal: caraSana('Distal'),
      oclusal_incisal: caraSana('Oclusal/Incisal')
    };

    return {
      numero,
      nombreColoquial: `Diente ${numero}`,
      estadoGeneral: { estado: 'Sano', colorHex: '#ffffff' },
      caras
    };
  }
}
