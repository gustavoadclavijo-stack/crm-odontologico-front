import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SpeechTranscriptionService } from './speech-transcription.service';

describe('SpeechTranscriptionService', () => {
  let service: SpeechTranscriptionService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(SpeechTranscriptionService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should send the recorded audio to the transcription endpoint', () => {
    const audio = new Blob(['recording'], { type: 'audio/webm' });
    let transcript = '';

    service.transcribir(audio).subscribe((text) => (transcript = text));
    const request = httpTesting.expectOne('/api/speech-to-text');
    expect(request.request.body).toBe(audio);
    expect(request.request.headers.get('Content-Type')).toBe('audio/webm');

    request.flush({ text: ' Hallazgo clínico ' });
    expect(transcript).toBe('Hallazgo clínico');
  });

  it('should fail when the transcription provider returns no text', () => {
    let receivedError: unknown;
    service.transcribir(new Blob(['recording'])).subscribe({
      error: (error: unknown) => (receivedError = error)
    });

    httpTesting.expectOne('/api/speech-to-text').flush({ text: '  ' });
    expect(receivedError).toBeInstanceOf(Error);
    expect((receivedError as Error).message).toContain('no devolvió texto');
  });

});
