export interface DatosPaciente {
  nombres: string;
  apellidos: string;
  identificacion: string;
  edad: string;
  genero: string;
  telefono: string;
  correo: string;
  direccion: string;
  ocupacion: string;
  aseguradora: string;
  contactoEmergencia: string;
  alergias: string;
  medicamentos: string;
  antecedentesMedicos: string;
  antecedentesOdontologicos: string;
}

export function crearPacienteVacio(): DatosPaciente {
  return {
    nombres: '',
    apellidos: '',
    identificacion: '',
    edad: '',
    genero: '',
    telefono: '',
    correo: '',
    direccion: '',
    ocupacion: '',
    aseguradora: '',
    contactoEmergencia: '',
    alergias: '',
    medicamentos: '',
    antecedentesMedicos: '',
    antecedentesOdontologicos: ''
  };
}
