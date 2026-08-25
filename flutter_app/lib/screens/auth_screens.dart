import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../data/remote/api_client.dart';
import '../state/providers.dart';
import '../theme/tokens.dart';
import '../widgets/ui/basics.dart';
import '../widgets/ui/fields.dart';

/// Shared chrome for the two auth screens: the brand mark, a centred card and
/// the link across to the other one.
class _AuthScaffold extends StatelessWidget {
  const _AuthScaffold({
    required this.title,
    required this.subtitle,
    required this.child,
    required this.footer,
  });

  final String title;
  final String subtitle;
  final Widget child;
  final Widget footer;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgApp,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: AppColors.evergreen,
                          borderRadius: BorderRadius.circular(13),
                        ),
                        child: const Icon(Icons.handshake_rounded,
                            size: 24, color: AppColors.teaGreen),
                      ),
                      const SizedBox(width: 12),
                      const Text('GestorPro', style: AppText.h1),
                    ],
                  ),
                  const SizedBox(height: 28),
                  AppCard(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(title, style: AppText.h2),
                        const SizedBox(height: 4),
                        Text(subtitle, style: AppText.body.copyWith(color: AppColors.textSecondary)),
                        const SizedBox(height: 24),
                        child,
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  footer,
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  String? _error;
  bool _submitting = false;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_email.text.trim().isEmpty || _password.text.isEmpty) {
      setState(() => _error = 'Informe e-mail e senha.');
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      await ref.read(authProvider.notifier).login(_email.text.trim(), _password.text);
      // The router's redirect takes it from here.
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _error = apiErrorMessage(error, 'Não foi possível entrar.');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return _AuthScaffold(
      title: 'Entrar',
      subtitle: 'Acesse sua conta para continuar.',
      footer: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text('Ainda não tem conta?', style: AppText.body.copyWith(color: AppColors.textSecondary)),
          TextButton(
            onPressed: () => context.go('/criar-conta'),
            style: TextButton.styleFrom(foregroundColor: AppColors.sageGreen),
            child: const Text('Criar conta'),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AppTextField(
            controller: _email,
            label: 'E-mail',
            hintText: 'voce@exemplo.com',
            keyboardType: TextInputType.emailAddress,
            autofillHints: const [AutofillHints.email],
            textInputAction: TextInputAction.next,
          ),
          const SizedBox(height: 16),
          AppTextField(
            controller: _password,
            label: 'Senha',
            obscureText: true,
            autofillHints: const [AutofillHints.password],
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => _submit(),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: AppText.caption.copyWith(color: AppColors.danger)),
          ],
          const SizedBox(height: 24),
          AppButton(label: 'Entrar', expand: true, isLoading: _submitting, onPressed: _submit),
        ],
      ),
    );
  }
}

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  String? _error;
  bool _submitting = false;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_name.text.trim().isEmpty || _email.text.trim().isEmpty || _password.text.length < 6) {
      setState(() => _error = 'Preencha nome, e-mail e uma senha de ao menos 6 caracteres.');
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      await ref
          .read(authProvider.notifier)
          .register(_name.text.trim(), _email.text.trim(), _password.text);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _error = apiErrorMessage(error, 'Não foi possível criar a conta.');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return _AuthScaffold(
      title: 'Criar conta',
      subtitle: 'Comece a organizar clientes, tarefas e finanças.',
      footer: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text('Já tem conta?', style: AppText.body.copyWith(color: AppColors.textSecondary)),
          TextButton(
            onPressed: () => context.go('/entrar'),
            style: TextButton.styleFrom(foregroundColor: AppColors.sageGreen),
            child: const Text('Entrar'),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AppTextField(
            controller: _name,
            label: 'Nome',
            hintText: 'Seu nome',
            textInputAction: TextInputAction.next,
          ),
          const SizedBox(height: 16),
          AppTextField(
            controller: _email,
            label: 'E-mail',
            hintText: 'voce@exemplo.com',
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.next,
          ),
          const SizedBox(height: 16),
          AppTextField(
            controller: _password,
            label: 'Senha',
            hint: 'Ao menos 6 caracteres.',
            obscureText: true,
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => _submit(),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: AppText.caption.copyWith(color: AppColors.danger)),
          ],
          const SizedBox(height: 24),
          AppButton(label: 'Criar conta', expand: true, isLoading: _submitting, onPressed: _submit),
        ],
      ),
    );
  }
}
