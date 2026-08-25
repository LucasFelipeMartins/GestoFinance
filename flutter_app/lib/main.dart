import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'data/local/local_db.dart';
import 'router.dart';
import 'state/providers.dart';
import 'theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Dates and currency are rendered in pt-BR everywhere, so the locale data
  // has to be loaded before the first frame formats anything.
  await initializeDateFormatting('pt_BR');

  final db = LocalDb.instance;
  await db.init();

  runApp(
    ProviderScope(
      overrides: [localDbProvider.overrideWithValue(db)],
      child: const GestorProApp(),
    ),
  );
}

class GestorProApp extends ConsumerStatefulWidget {
  const GestorProApp({super.key});

  @override
  ConsumerState<GestorProApp> createState() => _GestorProAppState();
}

class _GestorProAppState extends ConsumerState<GestorProApp> {
  @override
  void initState() {
    super.initState();
    // Restore the session first: if there is one, the sync engine starts and
    // the router lands on Home; if not, the redirect sends us to /entrar.
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await ref.read(authProvider.notifier).restore();
      if (ref.read(authProvider).status == AuthStatus.authenticated) {
        ref.read(syncEngineProvider).start();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'GestorPro',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      routerConfig: ref.watch(routerProvider),
      locale: const Locale('pt', 'BR'),
      supportedLocales: const [Locale('pt', 'BR')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
    );
  }
}
