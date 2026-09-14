import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Gift, Plus, Trash2, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { useToast } from '@/context/ToastContext';
import { adminService } from '@/services/adminService';
import { getApiErrorMessage } from '@/services/api';
import { formatDate } from '@/utils/formatters';

/**
 * Admin only: the e-mails that never pay. Granting works before the person
 * signs up, so the owner can free a family member's address in advance.
 */
export function FreeAccountsCard() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['admin', 'free-accounts'],
    queryFn: () => adminService.listFreeAccounts(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'free-accounts'] });

  const add = useMutation({
    mutationFn: () => adminService.addFreeAccount(email.trim(), note.trim()),
    onSuccess: () => {
      toast.success('Conta gratuita adicionada.');
      setEmail('');
      setNote('');
      invalidate();
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Não foi possível adicionar.')),
  });

  const remove = useMutation({
    mutationFn: (target: string) => adminService.removeFreeAccount(target),
    onSuccess: () => {
      toast.success('Conta gratuita removida.');
      invalidate();
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Não foi possível remover.')),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    add.mutate();
  };

  return (
    <Card className="mx-auto w-full max-w-lg">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-tint text-sage-green">
          <Gift size={20} />
        </span>
        <div>
          <h3 className="text-h3 text-text-primary">Contas gratuitas</h3>
          <p className="text-caption text-text-secondary">Só você vê isto. Quem estiver na lista usa o app sem pagar.</p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-5 flex flex-col gap-3" noValidate>
        <Input
          label="E-mail"
          type="email"
          inputMode="email"
          placeholder="pessoa@exemplo.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          label="Quem é (opcional)"
          placeholder="Ex: esposa"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <Button type="submit" leftIcon={<Plus size={17} />} isLoading={add.isPending} disabled={!email.trim()}>
          Liberar acesso gratuito
        </Button>
      </form>

      <div className="mt-5 border-t border-border pt-4">
        {isLoading ? (
          <p className="flex items-center gap-2 text-caption text-text-secondary">
            <Loader2 size={15} className="animate-spin" /> Carregando…
          </p>
        ) : !accounts || accounts.length === 0 ? (
          <p className="text-caption text-text-secondary">
            Ninguém liberado ainda. Você mesmo já é gratuito por ser administrador.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {accounts.map((account) => (
              <li key={account.email} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-strong text-text-primary">{account.email}</p>
                  <p className="truncate text-caption text-text-secondary">
                    {account.note ? `${account.note} · ` : ''}
                    {account.userName ? `conta de ${account.userName}` : 'ainda não criou a conta'} · desde{' '}
                    {formatDate(account.createdAt)}
                  </p>
                </div>
                <IconButton
                  icon={<Trash2 size={16} />}
                  label={`Remover ${account.email}`}
                  variant="danger"
                  onClick={() => remove.mutate(account.email)}
                  disabled={remove.isPending}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
