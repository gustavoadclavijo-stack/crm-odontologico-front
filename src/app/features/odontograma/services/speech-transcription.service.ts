import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

export interface SpeechTranscriptionProvider {
  transcribir(audio: Blob): Observable<string>;
}

@Injectable({ providedIn: 'root' })
export class SpeechTranscriptionService implements SpeechTranscriptionProvider {
  private readonly http = inject(HttpClient);

  transcribir(audio: Blob): Observable<string> {
    const headers = new HttpHeaders({
      'Content-Type': audio.type || 'audio/webm'
    });

    return this.http
      .post<{ text: string }>('/api/speech-to-text', audio, { headers })
      .pipe(
        map((response) => {
          const text = response?.text?.trim();
          if (!text) throw new Error('El servicio de transcripción no devolvió texto.');
          return text;
        })
      );
  }

}
