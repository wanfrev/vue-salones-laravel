import { defineMessages } from '../translate'

/** Spreadsheet: access control for sales reps and the PDF generator. */
export const spreadsheet = defineMessages(
  {
    'spreadsheet.access.title': 'Acceso al módulo',
    'spreadsheet.access.intro': 'Marca qué vendedores pueden entrar a Spreadsheet, además de ti.',
    'spreadsheet.access.empty': 'No hay vendedores registrados todavía. Créalos desde CRM.',
    'spreadsheet.access.granted': '{name} ahora tiene acceso',
    'spreadsheet.access.revoked': 'Acceso quitado a {name}',
    'spreadsheet.company': 'Empresa',
    'spreadsheet.selectCompany': 'Selecciona una empresa',
    'spreadsheet.searchCompany': 'Buscar empresa...',
    'spreadsheet.addEmployee': '+ Agregar empleado',
    'spreadsheet.pickCompany': 'Selecciona una empresa para ver sus empleados.',
    'spreadsheet.loadingEmployees': 'Cargando empleados...',
    'spreadsheet.noEmployees': 'Esta empresa no tiene empleados asignados todavía.',
    'spreadsheet.colEmployee': 'Empleado',
    'spreadsheet.colRoleShift': 'Rol / Turno',
    'spreadsheet.generatePdf': 'Generar PDF ({n})',
  },
  {
    'spreadsheet.access.title': 'Module access',
    'spreadsheet.access.intro': 'Check which sales reps can enter Spreadsheet, besides you.',
    'spreadsheet.access.empty': 'No sales reps are registered yet. Create them from CRM.',
    'spreadsheet.access.granted': '{name} now has access',
    'spreadsheet.access.revoked': 'Access removed for {name}',
    'spreadsheet.company': 'Company',
    'spreadsheet.selectCompany': 'Select a company',
    'spreadsheet.searchCompany': 'Search company...',
    'spreadsheet.addEmployee': '+ Add employee',
    'spreadsheet.pickCompany': 'Select a company to see its employees.',
    'spreadsheet.loadingEmployees': 'Loading employees...',
    'spreadsheet.noEmployees': 'This company has no employees assigned yet.',
    'spreadsheet.colEmployee': 'Employee',
    'spreadsheet.colRoleShift': 'Role / Shift',
    'spreadsheet.generatePdf': 'Generate PDF ({n})',
  },
)
