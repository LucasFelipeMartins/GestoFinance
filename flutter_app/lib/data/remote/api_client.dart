import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Where the API lives.
///
/// Overridable at build time so the same source ships to every target:
///   flutter run  --dart-define=API_URL=http://localhost:4000/api
///   flutter build web --dart-define=API_URL=https://gesto-finance.vercel.app/api
///
/// The default points at the deployed backend, which is what a packaged
/// Android/iOS build needs — a phone has no localhost server to talk to.
const String apiBaseUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'https://gesto-finance.vercel.app/api',
);

const _tokenKey = 'gestorpro.token';

/// Auth token storage.
///
/// The web client authenticates with an httpOnly cookie, but a cookie is not
/// reliably available to a packaged app, so every platform here uses the
/// Bearer token the server already returns from /auth/login — one code path
/// instead of three.
class TokenStorage {
  TokenStorage._();
  static final TokenStorage instance = TokenStorage._();

  static const _storage = FlutterSecureStorage();

  String? _cached;

  Future<String?> read() async {
    if (_cached != null) return _cached;
    try {
      return _cached = await _storage.read(key: _tokenKey);
    } catch (_) {
      // A browser with storage blocked still works for the session; the user
      // just has to log in again next time.
      return null;
    }
  }

  Future<void> write(String token) async {
    _cached = token;
    try {
      await _storage.write(key: _tokenKey, value: token);
    } catch (_) {/* see read() */}
  }

  Future<void> clear() async {
    _cached = null;
    try {
      await _storage.delete(key: _tokenKey);
    } catch (_) {/* see read() */}
  }
}

class ApiClient {
  ApiClient._() {
    dio = Dio(BaseOptions(
      baseUrl: apiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 20),
      headers: {'Content-Type': 'application/json'},
    ));

    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await TokenStorage.instance.read();
        if (token != null) options.headers['Authorization'] = 'Bearer $token';
        handler.next(options);
      },
    ));
  }

  static final ApiClient instance = ApiClient._();

  late final Dio dio;
}

/// A request that never reached the server (no connection, DNS, timeout), as
/// opposed to one the server rejected. The sync engine treats the two very
/// differently: offline means "try again later", rejected means "this entry
/// is bad".
bool isNetworkError(Object error) =>
    error is DioException &&
    (error.type == DioExceptionType.connectionError ||
        error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.sendTimeout ||
        error.response == null);

bool isNotFound(Object error) =>
    error is DioException && error.response?.statusCode == 404;

bool isUnauthorized(Object error) =>
    error is DioException && error.response?.statusCode == 401;

/// The server's error shape is `{ message, fields? }`; fall back to something
/// readable when it is anything else.
String apiErrorMessage(Object error, [String fallback = 'Algo deu errado. Tente novamente.']) {
  if (error is DioException) {
    if (isNetworkError(error)) return 'Sem conexão. A alteração foi salva e será enviada depois.';
    final data = error.response?.data;
    if (data is Map && data['message'] is String) return data['message'] as String;
  }
  return fallback;
}

Map<String, String>? apiFieldErrors(Object error) {
  if (error is DioException) {
    final fields = (error.response?.data as Map?)?['fields'];
    if (fields is Map) {
      return fields.map((key, value) => MapEntry(key.toString(), value.toString()));
    }
  }
  return null;
}
