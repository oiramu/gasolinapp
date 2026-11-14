const DEVICE_ID_LENGTH = 6

/** Identificador corto del dispositivo para soporte: los primeros caracteres del uid. */
export const formatDeviceId = (userId: string): string => userId.slice(0, DEVICE_ID_LENGTH)
