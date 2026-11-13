/**
 * El servidor rechaza cobrar una cita que ya está cobrada por completo (ver App\Services\PosService::ALREADY_CHARGED).
 * El POS reconoce ese rechazo por este fragmento del mensaje para no tratarlo como un error cualquiera.
 */
export const ALREADY_CHARGED_HINT = 'ya está cobrada'

/** Lo que se le muestra a la cajera cuando TODO lo que intentó cobrar ya estaba cobrado. */
export const ALREADY_CHARGED_MESSAGE = 'Esta cita ya está cobrada. Actualiza la pantalla y revisa Finanzas antes de volver a cobrar.'
