import { useState } from 'react';
import { Check, PiggyBank } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea, FieldLabel } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useCreateBox, useUpdateBox } from '@/hooks/useBoxes';
import { useToast } from '@/context/ToastContext';
import { getApiErrorMessage } from '@/services/api';
import { BOX_COLORS, BoxColor, InvestmentBox } from '@/types';
import { BOX_PALETTE } from './boxColors';

interface BoxFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  box?: InvestmentBox;
}

const NAME_SUGGESTIONS = ['Reserva de emergência', 'Viagem', 'Carro', 'Impostos', 'Férias', 'Casa'];

/** Create / edit a cofrinho: a name, how much it yields, and a colour. */
export function BoxFormModal({ open, onOpenChange, box }: BoxFormModalProps) {
  const isEditing = Boolean(box);
  const createBox = useCreateBox();
  const updateBox = useUpdateBox();
  const toast = useToast();

  const [name, setName] = useState(box?.name ?? '');
  const [cdiPercent, setCdiPercent] = useState<string>(String(box?.cdiPercent ?? 100));
  const [color, setColor] = useState<BoxColor>(box?.color ?? 'sage');
  const [notes, setNotes] = useState(box?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isSubmitting = createBox.isPending || updateBox.isPending;

  const submit = async () => {
    const nextErrors: Record<string, string> = {};
    const trimmed = name.trim();
    const rate = Number(cdiPercent.replace(',', '.'));
    if (!trimmed) nextErrors.name = 'Dê um nome ao cofrinho.';
    if (trimmed.length > 60) nextErrors.name = 'Nome muito longo.';
    if (!Number.isFinite(rate) || rate < 0 || rate > 1000)
      nextErrors.cdiPercent = 'Informe um percentual entre 0 e 1000.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const input = { name: trimmed, cdiPercent: rate, color, notes: notes.trim() || undefined };
    try {
      if (isEditing && box) await updateBox.mutateAsync({ id: box.id, input });
      else await createBox.mutateAsync(input);
      toast.success(
        isEditing ? 'Cofrinho atualizado.' : 'Cofrinho criado! Agora é só guardar dinheiro nele.'
      );
      onOpenChange(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível salvar o cofrinho.'));
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? 'Editar cofrinho' : 'Novo cofrinho'}
      description="Um cofrinho separa um dinheiro com um objetivo e um rendimento próprios. O total investido continua somando tudo."
      preventOutsideClose={isSubmitting}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={submit} isLoading={isSubmitting} leftIcon={<PiggyBank size={17} />}>
            {isEditing ? 'Salvar alterações' : 'Criar cofrinho'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <Input
            label="Nome"
            placeholder="Ex.: Reserva de emergência"
            value={name}
            maxLength={60}
            error={errors.name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
          />
          {!isEditing && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {NAME_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setName(suggestion)}
                  className="rounded-badge border border-border bg-surface px-2.5 py-1 text-caption text-text-secondary transition-colors hover:border-sage-green hover:text-text-primary"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        <Input
          label="Quanto rende (% do CDI)"
          type="number"
          inputMode="decimal"
          min="0"
          step="1"
          value={cdiPercent}
          error={errors.cdiPercent}
          hint="Está no app do banco: caixinha do Nubank rende 100% do CDI; um CDB pode render 110%."
          onChange={(event) => setCdiPercent(event.target.value)}
        />

        <div>
          <FieldLabel>Cor</FieldLabel>
          <div className="mt-1.5 flex flex-wrap gap-2" role="radiogroup" aria-label="Cor do cofrinho">
            {BOX_COLORS.map((key) => {
              const palette = BOX_PALETTE[key];
              const selected = key === color;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={palette.label}
                  title={palette.label}
                  onClick={() => setColor(key)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full transition-transform ${
                    selected ? 'scale-110 ring-2 ring-offset-2 ring-offset-surface' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: palette.main, ['--tw-ring-color' as string]: palette.main }}
                >
                  {selected && <Check size={16} className="text-white" />}
                </button>
              );
            })}
          </div>
        </div>

        <Textarea
          label="Observações (opcional)"
          placeholder="Para que é este dinheiro, onde está aplicado…"
          value={notes}
          maxLength={500}
          rows={2}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>
    </Modal>
  );
}
