import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import {
  DienteFdiMetadata,
  OdontogramaUpdateResponse,
  VoiceCaptureRequest
} from '../models/odontograma.models';

@Injectable({
  providedIn: 'root'
})
export class OdontogramaApiService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly baseUrl = 'http://localhost:8080/api/v1/odontogramas';

  /**
   * Envía el texto capturado (por voz o escritura) al backend para procesarlo con IA
   * y recibir los dientes actualizados con sus estados clínicos y colores.
   */
  procesarDictadoVoz(request: VoiceCaptureRequest): Observable<OdontogramaUpdateResponse> {
    if (!this.http) {
      return throwError(() => new Error('HttpClient no está configurado.'));
    }
    return this.http.post<OdontogramaUpdateResponse>(`${this.baseUrl}/voice-capture`, request);
  }

  /**
   * Consulta el catálogo oficial FDI de 32 dientes permanentes con sus nombres coloquiales
   * y clasificación anatómica.
   */
  obtenerCatalogoFdi(): Observable<DienteFdiMetadata[]> {
    if (!this.http) {
      return throwError(() => new Error('HttpClient no está configurado.'));
    }
    return this.http.get<DienteFdiMetadata[]>(`${this.baseUrl}/catalogo-fdi`);
  }
}
