import { Component, computed, input, output } from '@angular/core';

type FormaDiente = 'incisivo' | 'canino' | 'premolar' | 'molar';

@Component({
  selector: 'app-diente-grafico',
  standalone: true,
  templateUrl: './diente-grafico.html',
  styleUrl: './diente-grafico.scss'
})
export class DienteGraficoComponent {
  numeroDiente = input.required<number>();
  estado = input('Sano');
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

  onDienteClick(): void {
    this.dienteClickeado.emit(this.numeroDiente());
  }
}
