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

/// Getting the app onto a phone.
///
/// It lives here rather than only in the sidebar because the sidebar is
/// desktop-only — on a phone this screen (reached from "Mais") is the only
/// place the link is reachable at all.
class _DownloadAppCard extends StatelessWidget {
  const _DownloadAppCard();

  Future<void> _downloadAndroid(BuildContext context) async {
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
            const Expanded(child: Text('Instalar no celular', style: AppText.h3)),
          ]),
          const SizedBox(height: 8),
          Text(
            'Use o GestorPro fora do navegador, com ícone próprio e funcionando offline.',
            style: AppText.body.copyWith(color: AppColors.textSecondary),
          ),
          const SizedBox(height: 16),
          AppButton(
            label: 'Baixar para Android',
            icon: Icons.download_rounded,
            expand: true,
            onPressed: () => _downloadAndroid(context),
          ),
          const SizedBox(height: 10),
          AppButton(
            label: 'Instalar no iPhone',
            icon: Icons.phone_iphone_rounded,
            variant: AppButtonVariant.secondary,
            expand: true,
            onPressed: () => _showIosInstall(context),
          ),
          const SizedBox(height: 10),
          Text(
            'Android: arquivo .apk, instalação manual. iPhone: instalação pelo Safari — '
            'a Apple não permite instalar apps fora da App Store.',
            style: AppText.caption,
          ),
        ],
      ),
    );
  }
}

/// On iOS there is no sideloading and no App Store build, so "Adicionar à
/// Tela de Início" is genuinely how this app gets onto an iPhone. The web
/// client ships a manifest and an apple-touch-icon, so it installs as a real
/// standalone app rather than a bookmark — these are the taps to get there.
Future<void> _showIosInstall(BuildContext context) {
  const steps = [
    (
      icon: Icons.public_rounded,
      title: 'Abra o site no Safari',
      description: 'Precisa ser o Safari — outros navegadores no iPhone não instalam apps.',
    ),
    (
      icon: Icons.ios_share_rounded,
      title: 'Toque no botão Compartilhar',
      description: 'O ícone de quadrado com uma seta para cima, na barra inferior.',
    ),
    (
      icon: Icons.add_box_outlined,
      title: 'Escolha "Adicionar à Tela de Início"',
      description: 'Role a lista até encontrar a opção.',
    ),
    (
      icon: Icons.check_rounded,
      title: 'Confirme em "Adicionar"',
      description: 'O GestorPro abre em tela cheia, sem o Safari em volta.',
    ),
  ];

  return showAppSheet<void>(
    context,
    title: 'Instalar no iPhone',
    builder: (context) => Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          'A Apple não permite instalar apps fora da App Store, então no iPhone a '
          'instalação é feita pelo próprio Safari — em 4 toques.',
          style: AppText.body.copyWith(color: AppColors.textSecondary),
        ),
        const SizedBox(height: 20),
        for (var i = 0; i < steps.length; i++) ...[
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: AppColors.teaGreen.withValues(alpha: 0.5),
                  shape: BoxShape.circle,
                ),
                child: Icon(steps[i].icon, size: 18, color: AppColors.sageGreen),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${i + 1}. ${steps[i].title}', style: AppText.bodyStrong),
                    Text(steps[i].description, style: AppText.caption),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
        ],
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.bgApp,
            borderRadius: BorderRadius.circular(AppRadius.input),
          ),
          child: Text(
            'Instalado assim, o app guarda seus dados no aparelho e continua funcionando '
            'sem internet — igual à versão Android.',
            style: AppText.caption,
          ),
        ),
      ],
    ),
  );
}
