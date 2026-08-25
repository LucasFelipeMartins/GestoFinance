import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../data/remote/api_client.dart';
import '../state/providers.dart';
import '../theme/tokens.dart';
import '../utils/formatters.dart';
import '../widgets/layout/app_shell.dart' show SyncIndicator;
import '../widgets/ui/basics.dart';
import '../widgets/ui/feedback.dart';

/// The site that serves the packaged Android build — the API's own origin,
/// since the same deployment hosts both the web client and /api.
String get _siteOrigin {
  const suffix = '/api';
  if (apiBaseUrl.endsWith(suffix)) {
    return apiBaseUrl.substring(0, apiBaseUrl.length - suffix.length);
  }
  return apiBaseUrl;
}

final _apkUrl = Uri.parse('$_siteOrigin/downloads/gestorpro.apk');

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    final status = ref.watch(syncStatusProvider).status;

    return PageBody(children: [
      const PageHeader(title: 'Configurações', subtitle: 'Informações da sua conta e do app.'),

      AppCard(
        child: Row(children: [
          AppAvatar(
            name: user?.name ?? '',
            initials: getInitials(user?.name ?? ''),
            imageUrl: user?.avatarUrl,
            size: 56,
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(user?.name ?? '', overflow: TextOverflow.ellipsis, style: AppText.h3),
                Text(user?.email ?? '',
                    overflow: TextOverflow.ellipsis,
                    style: AppText.body.copyWith(color: AppColors.textSecondary)),
              ],
            ),
          ),
        ]),
      ),

      AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Sincronização', style: AppText.h3),
            const SizedBox(height: 4),
            Text(
              'Tudo que você faz é salvo neste aparelho primeiro e enviado quando há conexão.',
              style: AppText.caption,
            ),
            const SizedBox(height: 16),
            const SyncIndicator(),
            if (status.lastSyncedAt != null) ...[
              const SizedBox(height: 6),
              Text('Última sincronização: ${formatDateTime(status.lastSyncedAt!)}',
                  style: AppText.caption),
            ],
            const SizedBox(height: 16),
            AppButton(
              label: 'Sincronizar agora',
              icon: Icons.sync_rounded,
              variant: AppButtonVariant.secondary,
              isLoading: status.isSyncing,
              onPressed: () => ref.read(syncEngineProvider).run(),
            ),
          ],
        ),
      ),

      const _DownloadAppCard(),

      AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Conta', style: AppText.h3),
            const SizedBox(height: 12),
            AppButton(
              label: 'Sair da conta',
              icon: Icons.logout_rounded,
              variant: AppButtonVariant.danger,
              expand: true,
              onPressed: () async {
                final confirmed = await confirmDialog(
                  context,
                  title: 'Sair da conta?',
                  description: 'Os dados salvos neste aparelho serão apagados. '
                      'Alterações ainda não sincronizadas serão perdidas.',
                  confirmLabel: 'Sair',
                );
                if (confirmed) await ref.read(authProvider.notifier).logout();
              },
            ),
          ],
        ),
      ),
    ]);
  }
}

/// The Android download.
///
/// It lives here rather than only in the sidebar because the sidebar is
/// desktop-only — on a phone this screen (reached from "Mais") is the only
/// place the link is reachable at all.
class _DownloadAppCard extends StatelessWidget {
  const _DownloadAppCard();

  Future<void> _download(BuildContext context) async {
    try {
      final launched = await launchUrl(_apkUrl, mode: LaunchMode.externalApplication);
      if (!launched && context.mounted) {
        showToast(context, 'Não foi possível abrir o download.', tone: ToastTone.error);
      }
    } catch (_) {
      if (context.mounted) {
        showToast(
          context,
          'O app para Android ainda não está disponível para download.',
          tone: ToastTone.info,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // On iOS an APK is of no use to the person holding the phone, so the copy
    // says what it is for rather than pretending it will install here.
    final isIos = !kIsWeb && defaultTargetPlatform == TargetPlatform.iOS;

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppColors.teaGreen.withValues(alpha: 0.5),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.smartphone_rounded, size: 20, color: AppColors.sageGreen),
            ),
            const SizedBox(width: 12),
            const Expanded(child: Text('Baixar o app', style: AppText.h3)),
          ]),
          const SizedBox(height: 8),
          Text(
            isIos
                ? 'Baixe o instalador Android (.apk) para usar o GestorPro em um aparelho Android.'
                : 'Instale o GestorPro no seu Android para usar o app fora do navegador, '
                    'inclusive offline.',
            style: AppText.body.copyWith(color: AppColors.textSecondary),
          ),
          const SizedBox(height: 16),
          AppButton(
            label: 'Baixar para Android',
            icon: Icons.download_rounded,
            expand: true,
            onPressed: () => _download(context),
          ),
          const SizedBox(height: 8),
          Text('Arquivo .apk · instalação manual, fora da Play Store.', style: AppText.caption),
        ],
      ),
    );
  }
}
