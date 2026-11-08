import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { OdontogramaApiService } from './odontograma-api.service';

describe('OdontogramaApiService', () => {
  let service: OdontogramaApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(OdontogramaApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should send patient dictation to the backend patient voice endpoint', () => {
    const transcript = 'María López tiene 34 años y es alérgica a la penicilina.';
    let response: unknown;

    service.procesarDictadoPaciente(transcript).subscribe((data) => (response = data));
    const request = httpTesting.expectOne('/api/v1/pacientes/voice-capture');

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ textoCapturado: transcript });

    request.flush({ nombres: 'María', apellidos: 'López', edad: '34' });
    expect(response).toEqual({ nombres: 'María', apellidos: 'López', edad: '34' });
  });
});
