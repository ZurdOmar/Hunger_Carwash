/**
 * Error Handler - Manejo seguro de errores sin exponer detalles técnicos
 * Logs internos seguros + mensajes genéricos para usuarios
 */

export interface ErrorLog {
  timestamp: string;
  error: string;
  context: string;
  level: 'error' | 'warn' | 'info';
  userId?: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  'PGRST116': 'No tienes permiso para realizar esta acción',
  'PGRST301': 'El registro no existe',
  'PGRST302': 'Conflicto de datos',
  'PGRST': 'Error en la operación de base de datos',
  'network': 'Error de conexión. Verifica tu internet',
  'auth': 'Error de autenticación. Inicia sesión nuevamente',
  'validation': 'Los datos ingresados son inválidos',
  'timeout': 'La operación tardó demasiado. Intenta de nuevo',
};

/**
 * Log interno seguro - registra error técnico sin exponerlo
 */
export function logError(error: any, context: string, userId?: string) {
  const errorLog: ErrorLog = {
    timestamp: new Date().toISOString(),
    error: error?.message || String(error),
    context,
    level: 'error',
    userId,
  };

  // En producción, esto iría a un servicio de logging seguro (Sentry, LogRocket, etc)
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context}]`, error);
  }

  // Aquí podrías enviar a un endpoint de logging seguro
  // await fetch('/api/logs', { method: 'POST', body: JSON.stringify(errorLog) })
}

/**
 * Obtener mensaje genérico seguro para mostrar al usuario
 */
export function getUserMessage(error: any, defaultMessage: string = 'Ocurrió un error. Por favor, intenta de nuevo.'): string {
  if (!error) return defaultMessage;

  const message = error?.message || String(error);

  // Buscar mensajes pre-definidos por código de error
  for (const [code, userMessage] of Object.entries(ERROR_MESSAGES)) {
    if (message.includes(code)) {
      return userMessage;
    }
  }

  // Si contiene keywords peligrosos, retornar genérico
  const dangerousKeywords = ['SQL', 'database', 'table', 'column', 'constraint', 'function', 'procedure'];
  if (dangerousKeywords.some(kw => message.toLowerCase().includes(kw.toLowerCase()))) {
    return defaultMessage;
  }

  return defaultMessage;
}

/**
 * Manejador centralizado para try-catch
 */
export function handleError(
  error: any,
  context: string,
  defaultMessage: string = 'Ocurrió un error. Por favor, intenta de nuevo.',
  userId?: string
) {
  logError(error, context, userId);
  return getUserMessage(error, defaultMessage);
}

/**
 * Validar campos requeridos
 */
export function validateRequired(data: Record<string, any>, fields: string[]): string | null {
  for (const field of fields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      return `El campo "${field}" es requerido`;
    }
  }
  return null;
}

/**
 * Validar número en rango
 */
export function validateNumberRange(
  value: any,
  min: number,
  max: number,
  fieldName: string = 'valor'
): string | null {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return `${fieldName} debe ser un número válido`;
  }

  if (num < min) {
    return `${fieldName} debe ser mayor a ${min}`;
  }

  if (num > max) {
    return `${fieldName} debe ser menor a ${max}`;
  }

  return null;
}

/**
 * Sanitizar string input
 */
export function sanitizeString(input: string, maxLength: number = 255): string {
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>\"'`]/g, '') // Remove HTML/Script chars
    .replace(/\n/g, ' '); // Replace newlines
}

/**
 * Sanitizar placa de vehículo
 */
export function sanitizePlaca(placa: string): string {
  return placa
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9\-]/g, '') // Solo letras, números, guión
    .slice(0, 10); // Máximo 10 caracteres
}

/**
 * Validar placa
 */
export function validatePlaca(placa: string): string | null {
  const sanitized = sanitizePlaca(placa);

  if (!sanitized || sanitized.length < 3) {
    return 'Placa debe tener al menos 3 caracteres';
  }

  if (!/^[A-Z0-9\-]+$/.test(sanitized)) {
    return 'Placa contiene caracteres inválidos';
  }

  return null;
}

/**
 * Validar email
 */
export function validateEmail(email: string): string | null {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!regex.test(email)) {
    return 'Email inválido';
  }

  if (email.length > 254) {
    return 'Email demasiado largo';
  }

  return null;
}

/**
 * Validar monto de dinero
 */
export function validateMoney(amount: string | number, fieldName: string = 'Monto'): string | null {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(num)) {
    return `${fieldName} debe ser un número válido`;
  }

  if (num < 0) {
    return `${fieldName} no puede ser negativo`;
  }

  if (num > 9999999) {
    return `${fieldName} excede el límite permitido`;
  }

  if (!/^\d+(\.\d{0,2})?$/.test(String(amount))) {
    return `${fieldName} puede tener máximo 2 decimales`;
  }

  return null;
}

/**
 * Validar porcentaje
 */
export function validatePercent(percent: string | number, fieldName: string = 'Porcentaje'): string | null {
  const num = typeof percent === 'string' ? parseInt(percent) : percent;

  if (isNaN(num)) {
    return `${fieldName} debe ser un número válido`;
  }

  if (num < -100 || num > 100) {
    return `${fieldName} debe estar entre -100% y 100%`;
  }

  return null;
}
