import { Component, input, output } from '@angular/core';
import { DienteGraficoComponent } from '../diente-grafico/diente-grafico';
import { DienteData } from '../../models/odontograma.models';

export type OrientacionCuadrante =
  | 'superior-derecho'
  | 'superior-izquierdo'
  | 'inferior-derecho'
  | 'inferior-izquierdo';

@Component({
  selector: 'app-cuadrante',
  standalone: true,
  imports: [DienteGraficoComponent],
  templateUrl: './cuadrante.html',
  styleUrl: './cuadrante.scss'
})
export class CuadranteComponent {
  dientes = input.required<DienteData[]>();
  orientacion = input.required<OrientacionCuadrante>();
  numeroSeleccionado = input<number | null>(null);

  dienteClickeado = output<number>();
}