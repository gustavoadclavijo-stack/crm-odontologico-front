// features/odontograma/models/odontograma.models.ts

/**
 * Union Type con los estados clínicos permitidos. 
 * Esto asegura que el compilador arroje error si intentamos asignar un estado que no existe.
 */
export type EstadoClinico = 
  | 'Sano' 
  | 'Caries' 
  | 'Restaurado' 
  | 'Fracturado' 
  | 'Ausente' 
  | 'Extraído' 
  | 'Retenido'
  | 'Corona' 
  | 'Implante'
  | 'Sellante'
  | 'Presente'; // Estado por defecto general

export type GrupoDental = 'ANTERIOR' | 'POSTERIOR';
export type ArcadaDental = 'SUPERIOR' | 'INFERIOR';

/**
 * Representa el estado individual de una de las 5 caras del diente
 */
export interface CaraVisual {
  etiquetaVisual: string; // ej: "Mesial", "Oclusal", "Palatino"
  estado: EstadoClinico | string; // Se permite string como fallback por si el backend envía algo nuevo
  colorHex: string | null; // ej: "#EF4444" o null
}

/**
 * Agrupa las 5 caras exactas que envía el backend
 */
export interface CarasDiente {
  mesial: CaraVisual;
  distal: CaraVisual;
  vestibular: CaraVisual;
  palatino_lingual: CaraVisual;
  oclusal_incisal: CaraVisual;
}

/**
 * Representa el estado a nivel del diente completo (ej. si está ausente, no hay caras que pintar)
 */
export interface EstadoGeneral {
  estado: EstadoClinico | string;
  colorHex: string | null;
}

/**
 * Estructura central de un Diente
 */
export interface DienteData {
  numero: number;
  nombreColoquial: string;
  cuadrante?: number;
  grupoDental?: GrupoDental | string;
  estadoGeneral: EstadoGeneral;
  caras: CarasDiente;
}

/**
 * Metadatos del catálogo oficial FDI de 32 dientes permanentes
 */
export interface DienteFdiMetadata {
  numero: number;
  cuadrante: number;
  posicion: number;
  nombreColoquial: string;
  arcada: ArcadaDental | string;
  grupo: GrupoDental | string;
}

// ==========================================
// CONTRATOS DE TRANSFERENCIA (DTOS)
// ==========================================

/**
 * Contrato de Entrada: JSON que llega del Backend hacia el Frontend 
 * para actualizar el odontograma tras procesar la IA.
 */
export interface OdontogramaUpdateResponse {
  odontogramaId: string;
  dientes: DienteData[];
  diente?: DienteData; // Fallback opcional por si algún mock envía singular
}

/**
 * Contrato de Salida: JSON que envía el Frontend hacia el Backend
 * cuando el micrófono termina de capturar la frase o se envía el texto.
 */
export interface VoiceCaptureRequest {
  odontogramaId: string;
  textoCapturado: string;
  prompt?: string | null;
}
