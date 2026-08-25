# GestorPro — app Flutter

O mesmo produto do cliente web (`../client`), em Flutter, rodando em **web,
Android e iOS** a partir de uma base de código só.

O backend **não muda**: este app consome a mesma API Express/MongoDB em
`../server`. Os dois clientes podem ser usados ao mesmo tempo, na mesma conta —
eles sincronizam pelo servidor.

## Como rodar

O endereço da API é definido em tempo de build, então o mesmo código serve para
qualquer alvo:

```bash
# Web, contra o backend local
flutter run -d chrome --dart-define=API_URL=http://localhost:4000/api

# Android, contra o backend publicado
flutter run -d android --dart-define=API_URL=https://gesto-finance.vercel.app/api

# Sem --dart-define, o padrão é o backend publicado — que é o que um app
# empacotado precisa (um celular não tem localhost servindo nada).
flutter run
```

### Rodando web contra o backend local

O Express só aceita requisições da própria origem ou das listadas em
`CLIENT_ORIGIN`. O `flutter run -d chrome` sobe em uma porta aleatória, então
fixe uma e adicione ao `.env` do servidor:

```bash
flutter run -d chrome --web-port=5174 --dart-define=API_URL=http://localhost:4000/api
```

```
CLIENT_ORIGIN=http://localhost:5173,http://localhost:5174
```

## Builds

```bash
flutter build web --release --dart-define=API_URL=https://seu-backend/api
flutter build apk --release --dart-define=API_URL=https://seu-backend/api
flutter build ipa --release --dart-define=API_URL=https://seu-backend/api   # só em macOS
```

**iOS exige macOS com Xcode.** A pasta `ios/` está gerada e o código é
independente de plataforma, mas nada de iOS pode ser compilado no Windows.

## Testes

```bash
flutter test
```

Cobrem a matemática financeira (parcelas espalhadas pelos meses, faixas de IR,
CDI sobre a taxa diária) e o repositório de Metas contra um Hive real —
depósitos, conclusão automática ao bater a meta, e o que a fila de sincronização
enfileira.

## Como está organizado

```
lib/
  models/        # entidades + enums, com o valor que cada uma usa no wire
  data/
    local/       # Hive: as caixas e a fila de saída (outbox)
    remote/      # cliente HTTP e os serviços da API
    repositories/# toda leitura e escrita passa por aqui
    sync/        # a única parte que fala com a rede
  state/         # providers Riverpod
  utils/         # formatação, matemática financeira, metadados das séries
  widgets/       # kit de UI + componentes de finanças, metas e layout
  screens/       # uma por rota
```

### Duas decisões que valem saber

**Local-first.** As telas leem e escrevem no Hive; o motor de sincronização
drena a fila quando há conexão e depois puxa o estado do servidor. Nada na
interface espera por requisição — o app funciona inteiro offline, em qualquer
plataforma.

**Token, não cookie.** O cliente web original autentica por cookie httpOnly,
mas um app empacotado não tem cookie confiável. Aqui todas as plataformas usam
o Bearer token que o servidor já devolve no `/auth/login` — um caminho só, em
vez de três.

## Notas de ambiente

`android/gradle.properties` desliga a compilação incremental do Kotlin: nesta
máquina ela falha ao fechar os caches e quebra o build dos plugins.

`flutter_secure_storage` está fixado em 9.2.4 — a 11.x exige `compileSdk 37`,
acima do que o Android Gradle Plugin desta versão aceita.
