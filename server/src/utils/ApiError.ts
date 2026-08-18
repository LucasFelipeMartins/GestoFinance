export class ApiError extends Error {
  status: number;
  fields?: Record<string, string>;

  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }

  static badRequest(message: string, fields?: Record<string, string>) {
    return new ApiError(400, message, fields);
  }

  static unauthorized(message = 'Não autorizado.') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Acesso negado.') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Recurso não encontrado.') {
    return new ApiError(404, message);
  }

  static conflict(message: string) {
    return new ApiError(409, message);
  }
}
