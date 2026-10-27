import { Component, input, output, computed } from '@angular/core';
import { CuadranteComponent } from '../cuadrante/cuadrante';
import { DienteData } from '../../models/odontograma.models';

@Component({
  selector: 'app-odontograma-grid',
  standalone: true,
  imports: [CuadranteComponent],
  templateUrl: './odontograma-grid.html',
  styleUrl: './odontograma-grid.scss'
})
export class OdontogramaGridComponent {
  dientes = input.required<DienteData[]>();
  numeroSeleccionado = input<number | null>(null);

  cuadranteSupDer = computed(() =>
    this.dientes()
      .filter((diente) => diente.numero >= 11 && diente.numero <= 18)
      .sort((a, b) => b.numero - a.numero)
  );
  cuadranteSupIzq = computed(() => this.dientes().filter((diente) => diente.numero >= 21 && diente.numero <= 28));
  cuadranteInfDer = computed(() => this.dientes().filter((diente) => diente.numero >= 41 && diente.numero <= 48).reverse());
  cuadranteInfIzq = computed(() => this.dientes().filter((diente) => diente.numero >= 31 && diente.numero <= 38));

  dienteClickeado = output<number>();
}