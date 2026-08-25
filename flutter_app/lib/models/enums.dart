// Domain enums. Each carries the exact string the API uses on the wire, so
// there is one place where the Dart name and the JSON value are tied
// together — the server contract lives in server/src/types/enums.ts.

enum Priority { critical, high, medium, low, veryLow }

extension PriorityWire on Priority {
  String get wire => switch (this) {
        Priority.critical => 'critical',
        Priority.high => 'high',
        Priority.medium => 'medium',
        Priority.low => 'low',
        Priority.veryLow => 'very-low',
      };

  String get label => switch (this) {
        Priority.critical => 'Máxima',
        Priority.high => 'Alta',
        Priority.medium => 'Média',
        Priority.low => 'Baixa',
        Priority.veryLow => 'Muito baixa',
      };

  /// Lower sorts first. Mirrors PRIORITY_RANK on the server.
  int get rank => switch (this) {
        Priority.critical => 1,
        Priority.high => 2,
        Priority.medium => 3,
        Priority.low => 4,
        Priority.veryLow => 5,
      };

  static Priority fromWire(String? value) => switch (value) {
        'critical' => Priority.critical,
        'high' => Priority.high,
        'low' => Priority.low,
        'very-low' => Priority.veryLow,
        _ => Priority.medium,
      };
}

enum EntityStatus { pending, inProgress, completed }

extension EntityStatusWire on EntityStatus {
  String get wire => switch (this) {
        EntityStatus.pending => 'pending',
        EntityStatus.inProgress => 'in-progress',
        EntityStatus.completed => 'completed',
      };

  String get label => switch (this) {
        EntityStatus.pending => 'Pendente',
        EntityStatus.inProgress => 'Em andamento',
        EntityStatus.completed => 'Concluído',
      };

  static EntityStatus fromWire(String? value) => switch (value) {
        'in-progress' => EntityStatus.inProgress,
        'completed' => EntityStatus.completed,
        _ => EntityStatus.pending,
      };
}

/// The three financial ledgers. One entity, one box, one sync path — `kind`
/// is the discriminator and each page is a filtered view of it.
enum FinanceKind { income, expense, investment }

extension FinanceKindWire on FinanceKind {
  String get wire => switch (this) {
        FinanceKind.income => 'income',
        FinanceKind.expense => 'expense',
        FinanceKind.investment => 'investment',
      };

  String get label => switch (this) {
        FinanceKind.income => 'Lucro',
        FinanceKind.expense => 'Despesa',
        FinanceKind.investment => 'Investimento',
      };

  String get plural => switch (this) {
        FinanceKind.income => 'Lucros',
        FinanceKind.expense => 'Despesas',
        FinanceKind.investment => 'Investimentos',
      };

  static FinanceKind fromWire(String? value) => switch (value) {
        'income' => FinanceKind.income,
        'investment' => FinanceKind.investment,
        _ => FinanceKind.expense,
      };
}

/// How a despesa gets paid. `card` is the only one that carries parcelas.
enum PaymentMethod { pix, card }

extension PaymentMethodWire on PaymentMethod {
  String get wire => this == PaymentMethod.pix ? 'pix' : 'card';
  String get label => this == PaymentMethod.pix ? 'Pix' : 'Cartão';

  static PaymentMethod? fromWire(String? value) => switch (value) {
        'pix' => PaymentMethod.pix,
        'card' => PaymentMethod.card,
        _ => null,
      };
}

/// Where a lançamento came from. `manual` is everything typed into the
/// Finanças forms; `client` marks the receita a concluded Client produces on
/// its own, derived at read time and never stored.
enum FinanceSource { manual, client }
